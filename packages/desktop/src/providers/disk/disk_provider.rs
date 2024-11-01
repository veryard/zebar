use std::{any::Any, sync::Arc};

use serde::{Deserialize, Serialize};
use sysinfo::{Disk, Disks};
use tokio::sync::Mutex;

use crate::{impl_interval_provider, providers::ProviderOutput};

#[derive(Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct DiskProviderConfig {
    pub refresh_interval: u64,
}


#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DiskOutput {
    pub disks: Vec<DiskInner>,
}


#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DiskInner {
    pub name: String,
    pub file_system: String,
    pub mount_point: String,
    pub total_space: u64,
    pub available_space: u64,
    pub is_removable: bool,
    pub disk_type: String,
}

pub struct DiskProvider {
    config: DiskProviderConfig,
    system: Arc<Mutex<Disks>>,
}

impl DiskProvider {
    pub fn new(config: DiskProviderConfig, system: Arc<Mutex<Disks>>) -> DiskProvider {
        DiskProvider { config, system }
    }

    fn refresh_interval_ms(&self) -> u64 {
        self.config.refresh_interval
    }

    async fn run_interval(&self) -> anyhow::Result<ProviderOutput> {
        let mut disks = self.system.lock().await;
        // Refresh disk information
        disks.refresh();

        let mut list = Vec::new();

        for disk in disks.iter() {
          list.push(DiskInner {
                name: disk.name().to_string_lossy().into_owned(),
                file_system: disk.file_system().to_string_lossy().into_owned(),
                mount_point: disk.mount_point().to_string_lossy().into_owned(),
                total_space: disk.total_space(),
                available_space: disk.available_space(),
                is_removable: disk.is_removable(),
                disk_type: format!("{:?}", disk.kind()),
            });
        }

        let output = DiskOutput { disks: list };

        Ok(ProviderOutput::Disk(output))
    }
}

impl_interval_provider!(DiskProvider, true);
