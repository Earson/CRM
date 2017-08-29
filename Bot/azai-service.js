var request = require('request').defaults({encoding: null});
require('./constants.js')();

var needle = require('needle');

var azaiBaseUrl = process.env.AZAI_BASE_URL.trim('/');

exports.getThumbnail = function (height, width, image) {
    var thumbnailUrl = azaiBaseUrl + '/thumbnail?width=' + width + '&height=' + height;
    return getResultFromImage(thumbnailUrl, image);
};

exports.extractText = function (image) {
    var ocrUrl = azaiBaseUrl + '/ocr?language=unk';
    return getResultFromImage(ocrUrl, image);
};

exports.analyzeImage = function (image) {
    var analyzeUrl = azaiBaseUrl + '/analyze';
    return getResultFromImage(analyzeUrl, image);
};

function getResultFromImage (url, image) {
    switch(image.from) {
        case imageFrom.Url:
            return getResultFromUrl(url, image.payload);
        case imageFrom.Upload:
            var payloadStream = getImageStream(image.payload)
            return getResultFromStream(url, payloadStream);
    }
};

function getImageStream(files) {
    var headers = {};
    headers['Content-Type'] = files[0].contentType;
    return needle.get(files[0].contentUrl, { headers: headers });
};

function getResultFromStream (url, imgStream) {
    return new Promise( function (resolve, reject) {
        var requestData = {
            url: url,
            json: true,
            headers: {
                'content-type': 'application/octet-stream'
            }
        };

        imgStream.pipe(request.post(requestData, function (error, response, body) {
            if (error) {
                reject(error);
            } else if (response.statusCode !== 200) {
                reject(body);
            } else {
                resolve({body: body, type: response.headers['content-type']});
            }
        }));
    }
    );
};

function getResultFromUrl (url, imgUrl) {
    return new Promise( function (resolve, reject) {
        var requestData = {
            url: url,
            json: {'url': imgUrl},
            headers: {
                'content-type': 'application/json'
            }
        };

        request.post(requestData, function (error, response, body) {
            if (error) {
                reject(error);
            } else if (response.statusCode !== 200) {
                reject(body);
            } else {
                resolve({body: body, type: response.headers['content-type']});
            }
        });
    }
    );
};
