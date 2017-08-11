using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using System.Net.Http;
using System.IO;
using Microsoft.Net.Http.Headers;
using System.Text;

// For more information on enabling MVC for empty projects, visit https://go.microsoft.com/fwlink/?LinkID=397860

namespace AllenlAiDemoWeb.Controllers
{
    public class AiController : Controller
    {
        private readonly IConfiguration Config;

        public AiController(IConfiguration configuration)
        {
            Config = configuration;
        }

        [HttpPost]
        // GET: /<controller>/
        public async Task<IActionResult> Thumbnail(int width, int height)
        {
            var visionApiKey = Config["visionApiKey"];
            var getThumbnailUrl = string.Format(Config["VisionApiUrl"], width, height);

            try
            {
                using (var httpClient = new HttpClient())
                {
                    httpClient.DefaultRequestHeaders.Add("Ocp-Apim-Subscription-Key", visionApiKey);

                    using (var content = new StreamContent(Request.Body))
                    {
                        content.Headers.Add("Content-Type", Request.ContentType);

                        using (var response = await httpClient.PostAsync(getThumbnailUrl, content))
                        {
                            response.EnsureSuccessStatusCode();
                            var result = await response.Content.ReadAsByteArrayAsync();
                            var type = response.Content.Headers.GetValues("content-type").FirstOrDefault();
                            return new FileContentResult(result, new MediaTypeHeaderValue(type));
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                return new BadRequestResult();
            }
        }
    }
}
