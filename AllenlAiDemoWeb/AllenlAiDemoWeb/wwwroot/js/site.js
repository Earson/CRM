// Write your Javascript code.
var fromUrl = true;

$(document).ready(function () {
    $("input[name=imageSource]:radio").change(function () {
        if (this.value === 'url') {
            $('#fromUrlDiv').show();
            $('#fromUploadDiv').hide();
            fromUrl = true;
        }

        if (this.value == 'upload') {
            $('#fromUrlDiv').hide();
            $('#fromUploadDiv').show();
            fromUrl = false;
        }
    });
});

function getThumbnail() {
    var inputHeight = heightInput.value;
    var inputWidth = widthInput.value;
    var payloadData;
    var contentType;

    if (fromUrl) {
        var inputUrl = urlInput.value.toString();
        var payload = {
            url: inputUrl
        };
        payloadData = JSON.stringify(payload);
        contentType = "application/json";
    }
    else {
        // upload from local
        payloadData = imageUpload.files[0];
        contentType = "application/octet-stream";
    }

    //var params = {
    //    "width": inputWidth,
    //    "height": inputHeight,
    //    "smartCropping": "true",
    //};

    //$.ajax({
    //    url: "https://api.cognitive.azure.cn/vision/v1.0/generateThumbnail?" + $.param(params),
    //    headers: {
    //        'Content-Type': 'application/json', 'Ocp-Apim-Subscription-Key': '3e256431932c49a7ac57f2a59e6fb76f'
    //    },
    //    type: "POST",
    //    data: payloadData,
    //    dataType: "binary",
    //    success: function (result) {

    //    },
    //    fail: function (result) {

    //    }
    //});

    try {
        var http = new XMLHttpRequest();

        http.onreadystatechange = function() {
            if (http.readyState === 4) {
                end = new Date().getTime();
                if (http.status === 200) {
                    urlInput.value = '';
                    heightInput.value = '';
                    widthInput.value = '';
                    var imageType = http.getResponseHeader("Content-Type");
                    var base64Data = binaryToBase64(http.response);
                    $('#thumbnailImage').attr("src", "data:" + imageType + ";base64," + base64Data);
                }                
                updateResult(http, (end - start));
            }
        };
        start = new Date().getTime();
        http.open("POST", "/Ai/Thumbnail?width=" + inputWidth + "&height=" + inputHeight);
        http.setRequestHeader("content-type", contentType);
        http.responseType = 'arraybuffer';
        http.send(payloadData);
    } catch (err) {
        showResult("ERROR", err.message, false);
    }    
}

function binaryToBase64(response) {
    var uInt8Array = new Uint8Array(response);
    var i = uInt8Array.length;
    var binaryString = new Array(i);
    while (i--) {
        binaryString[i] = String.fromCharCode(uInt8Array[i]);
    }
    var data = binaryString.join('');
    return btoa(data);
}

function updateResult(http, timeTaken) { 
    var msgHeading = http.status + ' ' + http.statusText;
    var msgBody = "Invalid request, please ensure right input provided!";
    var success = false;
    if (http.status < 299) {
        msgBody = 'Result returned in ' + timeTaken.toString() + ' ms from ' + http.responseURL;
        success = true;
    }
    showResult(msgHeading, msgBody, success);
}

function showResult(msgHeading, msgBody, success){
    $('#result').show();
    statusPanel.className = (success) ? 'panel panel-success' : 'panel panel-danger';
    statusPanelHeading.innerHTML = msgHeading;
    statusPanelBody.innerHTML = msgBody;
}
