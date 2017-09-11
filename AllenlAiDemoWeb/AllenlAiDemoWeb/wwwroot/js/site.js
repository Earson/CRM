// Write your Javascript code.
var fromUrl = true;

$(document).ready(function () {
    $("input[name=imageSource]:radio").change(function () {
        if (this.value === 'url') {
            $('#fromUrlDiv').show();
            $('#fromUploadDiv').hide();
            fromUrl = true;
        }

        if (this.value === 'upload') {
            $('#fromUrlDiv').hide();
            $('#fromUploadDiv').show();
            fromUrl = false;
        }
    });
});

function getThumbnail() {    
    var inputHeight = heightInput.value;
    var inputWidth = widthInput.value;

    var imageInputValue = getImageInput();
    var payloadData = imageInputValue[0];
    var contentType = imageInputValue[1];

    // ajax doesn't support arraybuffer or blob yet    
    var xhr = new XMLHttpRequest();

    xhr.onreadystatechange = function () {
        if (xhr.readyState === 4) {
            try {
                end = new Date().getTime();
                if (xhr.status === 200) {
                    urlInput.value = '';
                    heightInput.value = '';
                    widthInput.value = '';
                    var imageType = xhr.getResponseHeader("Content-Type");
                    var base64Data = binaryToBase64(xhr.response);
                    $('#thumbnailImage').attr("src", "data:" + imageType + ";base64," + base64Data);
                    //$('#thumbnailImage').attr("src", binaryToImageSrc(xhr.response, imageType));
                }
                else {
                    $('#thumbnailImage').attr("src", "");
                }
                showRequestResult(xhr, (end - start));
            } catch (err) {
                showResult("ERROR", err.message, false);
            }
        }
    };
    start = new Date().getTime();
    xhr.open("POST", "/ComputerVision/Thumbnail?width=" + inputWidth + "&height=" + inputHeight);
    xhr.setRequestHeader("content-type", contentType);
    xhr.responseType = 'arraybuffer';
    xhr.send(payloadData);
    $('#result').hide();
    $('#progress').show();
}

function getOcr() {    
    var selectElement = document.getElementById("textLanguage");
    var selectedLanguage = selectElement.options[selectElement.selectedIndex].value.toString();

    var imageInputValue = getImageInput();
    var payloadData = imageInputValue[0];
    var contentType = imageInputValue[1];

    var params = {
        "language": selectedLanguage
    };

    $.ajax({
        url: "/ComputerVision/Ocr?" + $.param(params),
        headers: {
            'Content-Type': contentType
        },
        type: "POST",
        data: payloadData,
        processData: false, // Don't process the file
        contentType: false, // Set content type to false as jQuery will tell the server its a query string request
        success: function (result, xhr) {
            //var obj = JSON.parse(result);           
            document.getElementById('textInImage').innerHTML = result.words;
        },
        error: function (result) {
            document.getElementById('textInImage').innerHTML = "";
        },
        complete: function (xhr) {
            end = new Date().getTime();
            showRequestResult(xhr, (end - start));
        }
    });
    start = new Date().getTime();
    $('#result').hide();
    $('#progress').show();
}

function analyze() {
    var imageInputValue = getImageInput();
    var payloadData = imageInputValue[0];
    var contentType = imageInputValue[1];

    $.ajax({
        url: "/ComputerVision/Analyze",
        headers: {
            'Content-Type': contentType
        },
        type: "POST",
        data: payloadData,
        processData: false, // Don't process the file
        contentType: false, // Set content type to false as jQuery will tell the server its a query string request
        success: function (result, xhr) {
            //var obj = JSON.parse(result);  
            $('#anlyzeResult').show();
            document.getElementById('categoriesInImage').innerHTML = result.categories;
            document.getElementById('celebritiesInImage').innerHTML = result.detail;
            document.getElementById('imageTags').innerHTML = result.tags;
            document.getElementById('imageDescription').innerHTML = result.description;
            document.getElementById('isAdultContent').innerHTML = result.isAudltContent;
            document.getElementById('imageMetadata').innerHTML = result.metadata;
            document.getElementById('imageColors').innerHTML = result.color;
        },
        error: function (result) {
            $('#anlyzeResult').hide();
        },
        complete: function (xhr) {
            end = new Date().getTime();
            showRequestResult(xhr, (end - start));
        }
    });
    start = new Date().getTime();
    $('#result').hide();
    $('#progress').show();
}

function startBot()
{
    $.ajax({
        url: "/Bot/EmbedUrl",
        type: "GET",
        success: function (result) {
            $('#chat2Bot').show();
            $('#bot').attr("src", result.url);
        }
    });
}

function getImageInput() {
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
    return [payloadData, contentType];
}

function binary2String2(response) {
    return String.fromCharCode.apply(null, new Uint8Array(response));
}

function binary2String(response) {
    var uInt8Array = new Uint8Array(response);
    var i = uInt8Array.length;
    var binaryString = new Array(i);
    while (i--) {
        binaryString[i] = String.fromCharCode(uInt8Array[i]);
    }
    var str = binaryString.join('');
    return str;
}

function binaryToBase64(response) {
    var str = binary2String(response);
    return btoa(str);
}

function binaryToImageSrc(response, contentType) {
    var blob = new Blob([response], { type: contentType });
    var url = (window.URL || window.webkitURL).createObjectURL(blob);
    return url;
}

function showRequestResult(xhr, timeTaken) {
    var msgHeading = xhr.status + ' ' + xhr.statusText;
    if (xhr.status < 299) {
        msgBody = 'Successful result returned in ' + timeTaken.toString() + ' ms ';
        success = true;
    }
    else {
        msgBody = xhr.response ? binary2String(xhr.response) : xhr.responseText;
        success = false;
    }
    showResult(msgHeading, msgBody, success);
}

function showResult(msgHeading, msgBody, success) {
    $('#progress').hide();
    $('#result').show();
    statusPanel.className = (success) ? 'panel panel-success' : 'panel panel-danger';
    statusPanelHeading.innerHTML = msgHeading;
    statusPanelBody.innerHTML = msgBody;
}
