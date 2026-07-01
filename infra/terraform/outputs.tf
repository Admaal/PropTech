output "server_url" {
  value       = google_cloud_run_v2_service.server.uri
  description = "URL pública del API server"
}

output "mcp_ai_url" {
  value       = google_cloud_run_v2_service.mcp_ai.uri
  description = "URL interna del servicio MCP-AI"
}
