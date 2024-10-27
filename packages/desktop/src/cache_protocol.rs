use std::path::PathBuf;

use anyhow::{Context, Result};
use base64::{engine::general_purpose::URL_SAFE as BASE64, Engine as _};
use mime_guess::MimeGuess;
use reqwest::get;
use tauri::
  Url
;
use tokio::fs;

pub struct CacheProtocolHandler {
  cache_dir: PathBuf,
}

impl CacheProtocolHandler {
  pub fn new(path: PathBuf) -> Result<Self> {
    // Create the cache directory if it doesn't exist
    std::fs::create_dir_all(&path).with_context(|| {
      format!("Failed to create cache directory: {}", path.display())
    })?;
    Ok(Self { cache_dir: path })
  }

  /// Generates the cache path with the appropriate file extension.
  fn get_cache_path(&self, url: &str, extension: Option<&str>) -> PathBuf {
    let encoded = BASE64.encode(url);
    if let Some(ext) = extension {
      self.cache_dir.join(format!("{}.{}", encoded, ext))
    } else {
      self.cache_dir.join(encoded)
    }
  }

  /// Extracts the file extension from the URL path, if available.
  fn extract_extension_from_url(&self, url: &str) -> Option<String> {
    if let Ok(parsed_url) = Url::parse(url) {
      let path = parsed_url.path();
      PathBuf::from(path)
        .extension()
        .and_then(|ext| ext.to_str())
        .map(|s| s.to_string())
    } else {
      None
    }
  }

  async fn read_from_cache(
    &self,
    cache_path: &PathBuf,
  ) -> Result<Vec<u8>> {
    fs::read(cache_path).await.with_context(|| {
      format!("Failed to read from cache: {}", cache_path.display())
    })
  }

  async fn write_to_cache(
    &self,
    cache_path: &PathBuf,
    content: &[u8],
  ) -> Result<()> {
    fs::write(cache_path, content).await.with_context(|| {
      format!("Failed to write to cache: {}", cache_path.display())
    })
  }

  async fn fetch_from_network(
    &self,
    url: &str,
  ) -> Result<(Vec<u8>, Option<String>)> {
    let response = get(url)
      .await
      .with_context(|| format!("Failed to fetch URL: {}", url))?;

    // Extract MIME type from headers
    let mime_type = response
      .headers()
      .get(reqwest::header::CONTENT_TYPE)
      .and_then(|val| val.to_str().ok())
      .map(|s| s.to_string());

    let content = response
      .bytes()
      .await
      .with_context(|| "Failed to read response bytes")?
      .to_vec();

    Ok((content, mime_type))
  }

  pub async fn fetch(&self, url: &str) -> Result<(Vec<u8>, String)> {
    // Try to extract the extension from the URL
    let extension = self.extract_extension_from_url(url);

    // Generate the cache path with the extension
    let cache_path = self.get_cache_path(url, extension.as_deref());

    // Try reading from cache
    if fs::metadata(&cache_path).await.is_ok() {
      let content = self.read_from_cache(&cache_path).await?;

      // Determine MIME type based on file extension
      let mime_type = if let Some(ext) =
        cache_path.extension().and_then(|e| e.to_str())
      {
        MimeGuess::from_ext(ext).first_or_octet_stream().to_string()
      } else {
        "application/octet-stream".to_string()
      };

      return Ok((content, mime_type));
    }

    let extension = &extension.unwrap_or_else(|| "js".to_string());
    // Fetch from network if not in cache
    let (content, mime_type_opt) = self.fetch_from_network(url).await?;
    let cache_path = self.get_cache_path(url, Some(extension));

    // Write to cache
    self.write_to_cache(&cache_path, &content).await?;

    // Determine MIME type
    let mime_type = if let Some(mime) = &mime_type_opt {
      mime.clone()
    } else {
      MimeGuess::from_ext(extension)
        .first_or_octet_stream()
        .to_string()
    };

    Ok((content, mime_type))
  }
}
