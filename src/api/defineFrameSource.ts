import type { StaticCanvas } from "fabric/node";
import type { DebugOptions } from "../configuration.js";
import type { BaseLayer, OptionalPromise } from "../types.js";

/**
 * A public API for defining new frame sources.
 */
export function defineFrameSource<T extends BaseLayer>(
  type: T["type"],
  setup: FrameSourceSetupFunction<T>,
): FrameSourceFactory<T> {
  return {
    type,
    async setup(options: CreateFrameSourceOptions<T>) {
      return new FrameSource<T>(options, await setup(options));
    },
  };
}

export type CreateFrameSourceOptions<T> = DebugOptions & {
  width: number;
  height: number;
  duration: number;
  channels: number;
  framerateStr: string;
  params: T;
};

export interface FrameSourceFactory<T extends BaseLayer> {
  type: T["type"];
  setup: (fn: CreateFrameSourceOptions<T>) => Promise<FrameSource<T>>;
}

export interface FrameSourceImplementation {
  readNextFrame(
    progress: number,
    canvas: StaticCanvas,
    offsetTime: number,
  ): OptionalPromise<Buffer | void>;
  close?(): OptionalPromise<void | undefined>;
}

export type FrameSourceSetupFunction<T> = (
  fn: CreateFrameSourceOptions<T>,
) => Promise<FrameSourceImplementation>;

export class FrameSource<T extends BaseLayer> {
  options: CreateFrameSourceOptions<T>;
  implementation: FrameSourceImplementation;

  constructor(options: CreateFrameSourceOptions<T>, implementation: FrameSourceImplementation) {
    this.options = options;
    this.implementation = implementation;
  }

  async readNextFrame(time: number, canvas: StaticCanvas) {
    const { start, layerDuration, _globalDuration, _globalOffset } = this.layer as BaseLayer;

    // Time relative to this clip segment
    const localOffsetTime = time - (start ?? 0);

    // If this layer is part of a projected global layer, compute progress over the
    // full global duration so animations continue smoothly across clips.
    if (_globalDuration != null && _globalDuration > 0 && _globalOffset != null) {
      const globalOffsetTime = _globalOffset + localOffsetTime;
      const globalProgress = globalOffsetTime / _globalDuration;
      const shouldDrawLayer = globalProgress >= 0 && globalProgress <= 1;

      if (!shouldDrawLayer) return;

      return await this.implementation.readNextFrame(globalProgress, canvas, globalOffsetTime);
    }

    // Default behavior for clip-local layers
    const offsetTime = localOffsetTime;
    const offsetProgress = offsetTime / layerDuration!;
    const shouldDrawLayer = offsetProgress >= 0 && offsetProgress <= 1;

    // Skip drawing if the layer has not started or has already ended
    if (!shouldDrawLayer) return;

    return await this.implementation.readNextFrame(offsetProgress, canvas, offsetTime);
  }

  async close() {
    await this.implementation.close?.();
  }

  get layer() {
    return this.options.params;
  }
}
