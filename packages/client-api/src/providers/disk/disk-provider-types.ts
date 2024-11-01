import type { Provider } from '../create-base-provider';

export interface DiskProviderConfig {
  type: 'disk';

  /**
   * How often this provider refreshes in milliseconds.
   */
  refreshInterval?: number;
}

export type DiskProvider = Provider<DiskProviderConfig, DiskOutput>;

export interface DiskInner {
  name: string;
  file_system: string;
  mount_point: string;
  total_space: number;
  available_space: number;
  is_removable: boolean;
  disk_type: string;
}

export interface DiskOutput {
  disks: DiskInner[];
}
