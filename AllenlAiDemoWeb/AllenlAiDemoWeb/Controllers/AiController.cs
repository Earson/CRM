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
using System.Net;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

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
        public async Task<IActionResult> Thumbnail(int width, int height)
        {
            var getThumbnailUrl = $"{Config["VisionApiBaseUrl"].TrimEnd('/')}/generateThumbnail?width={width}&height={height}&smartCropping=true";

            return await ProcessImageAsync(getThumbnailUrl, Request.Body, async (response) =>
            {
                var result = await response.Content.ReadAsByteArrayAsync();
                var type = response.Content.Headers.GetValues("content-type").FirstOrDefault();
                return new FileContentResult(result, new MediaTypeHeaderValue(type));
            });
        }

        [HttpPost]
        public async Task<IActionResult> Ocr(string language)
        {
            var ocrUrl = $"{Config["VisionApiBaseUrl"].TrimEnd('/')}/ocr?language={language}&detectOrientation=true";

            return await ProcessImageAsync(ocrUrl, Request.Body, async (response) => 
            {
                var content = await response.Content.ReadAsStringAsync();
                var jObj = JObject.Parse(content);
                var resultObj = new
                {
                    language = jObj["language"].Value<string>(),
                    words = GetWords(jObj)
                };
                return new JsonResult(resultObj);
            });
        }

        [HttpPost]
        public async Task<IActionResult> Analyze()
        {
            var analyzeUrl = $"{Config["VisionApiBaseUrl"].TrimEnd('/')}/analyze?visualFeatures=Categories,Tags,Description,Color,Adult&details=Celebrities&language=en";

            return await ProcessImageAsync(analyzeUrl, Request.Body, async (response) =>
            {
                var content = await response.Content.ReadAsStringAsync();
                var jObj = JObject.Parse(content);
                var resultObj = new
                {
                    categories = GetCategories(jObj),
                    detail = GetDetails(jObj),
                    isAudltContent = GetIsAdultContent(jObj),
                    isRacyContent = GetIsRacyContent(jObj),
                    tags = GetTags(jObj),
                    description = GetDescription(jObj),
                    metadata = GetMetadata(jObj),
                    color = GetDominantColors(jObj)
                };
                return new JsonResult(resultObj);
            });
        }

        private string GetCategories(JObject jObj)
        {            
            if (jObj["categories"] == null)
            {
                return "none";
            }
            var strBuilder = new StringBuilder();
            foreach (var category in jObj["categories"].Children().ToList())
            {
                strBuilder.Append($"{category["name"].Value<string>()},");
            }
            return (strBuilder.Length == 0 ? "none" : strBuilder.ToString().TrimEnd(','));
        }

        private string GetDetails(JObject jObj)
        {
            if (jObj["categories"] == null)
            {
                return "none";
            }

            var strBuilder = new StringBuilder();
            foreach (var category in jObj["categories"].Children().ToList())
            {
                var detail = category["detail"];
                if (detail != null)
                {
                    foreach (var celebrity in detail["celebrities"].Children().ToList())
                    {
                        strBuilder.Append($"{celebrity["name"].Value<string>()},");
                    }
                }
            }
            return (strBuilder.Length==0 ? "none": strBuilder.ToString().TrimEnd(','));
        }

        private string GetIsAdultContent(JObject jObj)
        {
            return jObj["adult"]["isAdultContent"].Value<bool>() ? "Yes" : "No";
        }

        private string GetIsRacyContent(JObject jObj)
        {
            return jObj["adult"]["isRacyContent"].Value<bool>() ? "Yes" : "No";
        }

        private string GetTags(JObject jObj)
        {
            var strBuilder = new StringBuilder();
            foreach (var tag in jObj["tags"].Children().ToList())
            {
                strBuilder.Append($"{tag["name"].Value<string>()},");
            }
            return (strBuilder.Length == 0 ? "none" : strBuilder.ToString().TrimEnd(','));
        }

        private string GetDescription(JObject jObj)
        {
            var highestConfidenceDesc = jObj["description"]["captions"].Children().FirstOrDefault();
            return highestConfidenceDesc["text"].Value<string>();
        }

        private string GetMetadata(JObject jObj)
        {
            var metaData = jObj["metadata"];
            return $"width：{metaData["width"].Value<string>()} | height：{metaData["height"].Value<string>()} | format：{metaData["format"].Value<string>()}";
        }

        private string GetDominantColors(JObject jObj)
        {
            return jObj["color"]["dominantColors"].Values<string>().Aggregate((a, b) => { return $"{a},{b}"; });
        }

        private string GetWords(JObject jObj)
        {
            var strBuilder = new StringBuilder();
            foreach (var region in jObj["regions"].Children().ToList())
            {
                foreach (var line in region["lines"].Children().ToList())
                {
                    foreach (var word in line["words"].Children().ToList())
                    {
                        strBuilder.Append(word["text"].Value<string>());
                    }
                    strBuilder.Append("<br />");
                }
            }
            return strBuilder.ToString();
        }

        private async Task<IActionResult> ProcessImageAsync(string url, Stream body, Func<HttpResponseMessage, Task<IActionResult>> handleSuccessfulResponseAsync)
        {
            var visionApiKeySecretName = Config["KeyVault:VisionApiKeySecretName"];
            var visionApiKey = Config[visionApiKeySecretName];

            try
            {
                using (var httpClient = new HttpClient())
                {
                    httpClient.DefaultRequestHeaders.Add("Ocp-Apim-Subscription-Key", visionApiKey);

                    using (var content = new StreamContent(body))
                    {
                        content.Headers.Add("Content-Type", Request.ContentType);

                        using (var response = await httpClient.PostAsync(url, content))
                        {
                            if (response.IsSuccessStatusCode)
                            {
                                return await handleSuccessfulResponseAsync(response);
                            }
                            else
                            {
                                return new ContentResult()
                                {
                                    StatusCode = (int)response.StatusCode,
                                    Content = await response.Content.ReadAsStringAsync(),
                                    ContentType = "text/plain; charset=utf-8"
                                };
                            }
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                return new ContentResult()
                {
                    StatusCode = (int)HttpStatusCode.InternalServerError,
                    Content = $"Unexpected exception happened: {ex.Message}",
                    ContentType = "text/plain; charset=utf-8"
                };
            }
            
        }
    }
}
