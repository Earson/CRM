﻿using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;

namespace AllenlAiDemoWeb.Controllers
{
    public class HomeController : Controller
    {
        public IActionResult Index()
        {
            return View();
        }

        public IActionResult Thumbnail()
        {
            return View();
        }

        public IActionResult Ocr()
        {
            return View();
        }

        public IActionResult Analyze()
        {
            return View();
        }

        public IActionResult Bot()
        {
            return View();
        }

        public IActionResult Error()
        {
            return View();
        }
    }
}
