import {
  PhysicalPosition,
  PhysicalSize,
  getCurrent as getCurrentWindow,
} from '@tauri-apps/api/window';

import { useLogger } from '../logging';
import { memoize } from '../utils';
import { useCurrentMonitor } from './use-current-monitor.hook';

export interface WindowPosition {
  x?: string;
  y?: string;
  width?: string;
  height?: string;
}

export interface WindowStyles {
  alwaysOnTop?: boolean;
  showInTaskbar?: boolean;
  resizable?: boolean;
}

/**
 * Hook for interacting with Tauri's window-related APIs.
 */
export const useCurrentWindow = memoize(() => {
  const logger = useLogger('useCurrentWindow');
  const currentMonitor = useCurrentMonitor();

  async function setPosition(position: WindowPosition) {
    const monitorPosition = await currentMonitor.getPosition();

    const parsedPosition = {
      x: position.x ? evalToInt(position.x) : monitorPosition.x,
      y: position.y ? evalToInt(position.y) : monitorPosition.y,
      width: position.width ? evalToInt(position.width) : monitorPosition.width,
      height: position.height ? evalToInt(position.height) : 30,
    };

    logger.debug(`Setting window position to:`, parsedPosition);

    await getCurrentWindow().setPosition(
      new PhysicalPosition(parsedPosition.x, parsedPosition.y),
    );

    await getCurrentWindow().setSize(
      new PhysicalSize(parsedPosition.width, parsedPosition.height),
    );
  }

  async function setStyles(styles: WindowStyles) {
    await getCurrentWindow().setAlwaysOnTop(styles.alwaysOnTop ?? true);
    await getCurrentWindow().setSkipTaskbar(styles.showInTaskbar ?? false);
    await getCurrentWindow().setResizable(styles.resizable ?? false);
  }

  function evalToInt(arg: string): number {
    try {
      const result = eval(arg);
      return parseInt(result);
    } catch (e) {
      throw new Error(
        `Not a valid position variable '${arg}'. It needs to evaluate to a number.`,
      );
    }
  }

  return {
    setPosition,
    setStyles,
  };
});