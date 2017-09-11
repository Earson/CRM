using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Threading.Tasks;

namespace AllenlAiDemoWeb.Controllers
{
    public class BotController : Controller
    {
        private readonly IConfiguration _config;
        private HttpClient _httpClient;

        public BotController(IConfiguration configuration)
        {
            _config = configuration;
            _httpClient = new HttpClient();
            var botWebChatSecretName = _config["KeyVault:BotWebChatSecretName"];
            var botWebChatKey = _config[botWebChatSecretName];
            _httpClient.DefaultRequestHeaders.Add("Authorization", $"BotConnector {botWebChatKey}");
        }

        [HttpGet]
        public async Task<IActionResult> EmbedUrl()
        {
            var botTokenUrl = "https://webchat.botframework.com/api/tokens";
            var botToken = await this._httpClient.GetStringAsync(botTokenUrl);
            var embedUrlWithToken = $"https://webchat.botframework.com/embed/azaidemo?t={botToken.Trim('"')}";
            return new JsonResult(new { url = embedUrlWithToken });
        }
    }
}
