
// loads the environment variables
require('dotenv-extended').load();
require('./constants.js')();

var builder = require('botbuilder'),
    needle = require('needle'),
    restify = require('restify'),
    azaiService = require('./azai-service');
    
var connector = new builder.ChatConnector({
    appId: process.env.MICROSOFT_APP_ID,
    appPassword: process.env.MICROSOFT_APP_PASSWORD
});

var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
    console.log('%s is listening to %s', server.name, server.url);
});

server.post('/api/messages', connector.listen());

var bot = new builder.UniversalBot(connector, 
    {
        localizerSettings: {
            botLocalePath: "./locale",
            defaultLocale: "zh"
        }
    });

bot.dialog('/', [
    function (session) {
        // none match
        session.send('cantunderstand');
    }
]);

bot.on('conversationUpdate', function (message) {
    if (message.membersAdded) {
        message.membersAdded.forEach(function (identity) {
            if (identity.id === message.address.bot.id) {
                bot.beginDialog(message.address, 'pickLocale');
                //var reply = new builder.Message()
                //    .address(message.address)
                //    .text('欢迎访问AzAiDemo机器人!');
                //bot.send(reply);
            }
        });
    }
}); 

// luis recognizer for core understanding
var helloR = new builder.LocalizedRegExpRecognizer("HelloIntent", 'hello_regexp');
var helpR = new builder.LocalizedRegExpRecognizer("HelpIntent",  'help_regexp'); 
var cancelR = new builder.LocalizedRegExpRecognizer("CancelIntent",  'cancel_regexp');
var reloadR = new builder.LocalizedRegExpRecognizer("ReloadIntent",  'reload_regexp');
var luisR = new builder.LuisRecognizer({
    'zh': process.env.LUIS_MODEL_URL_ZH,
    'en': process.env.LUIS_MODEL_URL_EN
});
let rSet = new builder.IntentRecognizerSet({
    recognizeOrder: builder.RecognizeOrder.series,
    stopIfExactMatch: true,
    recognizers: [helloR, helpR, cancelR, reloadR, luisR]
});
bot.recognizer(rSet);

bot.dialog('getThumbnail', [
    // step 1: ask for image
    function (session) {
        session.beginDialog('confirmAndAskImage', 'thumbnail_confirm');
    },    
    // step 2: ask for thumbnail height
    function (session, results) {
        if (results.response) {
            session.dialogData.image = {};
            session.dialogData.image = results.response;
            builder.Prompts.number(session, 'thumbnail_height', { maxRetries: 3 });
        } else {
            session.endDialog('invalid_response');
        }
    },
    // step 3: ask for thumbnail width
    function (session, results) {
        if (results.response) {
            session.dialogData.height = results.response;
            builder.Prompts.number(session, 'thumbnail_width', { maxRetries: 3 });
        } else {
            session.endDialog('invalid_response');
        }
    },
    // step 4: get thumbnail from cognitive api
    function (session, results) {
        if (results.response) {
        session.dialogData.width = results.response;
        session.send("thumbnail_summary", session.dialogData.height, session.dialogData.width);
        azaiService
            .getThumbnail(session.dialogData.height, session.dialogData.width, session.dialogData.image)
            .then(function (data) { showThumbnail(session, data); } )
            .catch(function (error) { handleErrorResponse(session, error); });
        } else {
            session.endDialog('invalid_response');
        }
    }
]).triggerAction({
    matches: 'Thumbnail',
    confirmPrompt: 'interrupt_warning'
}).cancelAction('cancelGetThumbnail', 'cancel_msg', {
    matches: 'CancelIntent',
    confirmPrompt: 'confirm'
}).reloadAction('startOver', 'reload_msg', {
    matches: 'ReloadIntent'
});

bot.dialog('extractText', [
    // step 1: ask for image
    function (session) {
        session.beginDialog('confirmAndAskImage', 'extracttext_confirm');
    },
    // step 2: get text in image from cognitive api
    function (session, results) {
        if(results.response) {
            session.send("extracttext_summary");
            azaiService
                .extractText(results.response)
                .then(function (data) { showText(session, data); })
                .catch(function (error) { handleErrorResponse(session, error); });
        } else {
            session.endDialog('invalid_response');
        }        
    }
]).triggerAction({
    matches: 'ExtractText',
    confirmPrompt: 'interrupt_warning'
}).cancelAction('cancelExtractText', 'cancel_msg', {
    matches: 'CancelIntent',
    confirmPrompt: 'confirm'
}).reloadAction('startOver', 'reload_msg', {
    matches: 'ReloadIntent'
});

bot.dialog('analyzeImage', [
    // step 1: ask for image
    function (session) {
        session.beginDialog('confirmAndAskImage', 'analyze_confirm');
    },
    // step 2: get image analysis result from cognitive api
    function (session, results) {
        if (results.response) {
            session.send("analyze_summary");
            azaiService
                .analyzeImage(results.response)
                .then(function (data) { showAnalysis(session, data); })
                .catch(function (error) { handleErrorResponse(session, error); });
        } else {
            session.endDialog('invalid_response');
        }  
    }
]).triggerAction({
    matches: 'Analyze',
    confirmPrompt: 'interrupt_warning'
}).cancelAction('cancelAnalyzeImage', 'cancel_msg', {
    matches: 'CancelIntent',
    confirmPrompt: 'confirm'
}).reloadAction('startOver', 'reload_msg', {
    matches: 'ReloadIntent'
});

var pickLocaleOption;
var getThumbnailOption;
var extractTextOption;
var analyzeImageOption;

bot.dialog('help', [
    function (session) {
        pickLocaleOption = session.localizer.gettext(session.preferredLocale(), 'pick_locale_option');
        getThumbnailOption = session.localizer.gettext(session.preferredLocale(), 'get_thumbnail_option');
        extractTextOption = session.localizer.gettext(session.preferredLocale(), 'extract_text_option');
        analyzeImageOption = session.localizer.gettext(session.preferredLocale(), 'analyze_image_option');
        builder.Prompts.choice(session, 
            'help_choice_prompt',
            [pickLocaleOption, getThumbnailOption, extractTextOption, analyzeImageOption],
            {listStyle: builder.ListStyle.button}
        );
    },
    function (session, results) {
        switch (results.response.entity) {
            case pickLocaleOption:
                session.beginDialog('pickLocale');
                break;
            case getThumbnailOption:
                session.beginDialog('getThumbnail');
                break;
            case extractTextOption:
                session.beginDialog('extractText');
                break;
            case analyzeImageOption:
                session.beginDialog('analyzeImage');
                break;
        }               
    }
]).triggerAction({
    matches: 'HelpIntent',
    // onSelectAction: (session, args, next) => {
    //     session.beginDialog(args.action, args);
    // }
});

bot.dialog('hello', [
    function (session) {
        session.endDialog('hello_back_msg');
    }
]).triggerAction({
    matches: 'HelloIntent'
});

bot.dialog('pickLocale', [
    function (session) {
        builder.Prompts.choice(session, 
            "locale_choice_prompt", 
            '中文|English',
            {listStyle: builder.ListStyle.button});
    },
    function (session, results) {
        var locale;
        switch (results.response.entity) {
            case 'English':
                locale = 'en';
                break;
            case '中文':
                locale = 'zh';
                break;
        }
        session.preferredLocale(locale, function (err) {
            if (!err) {
                session.endDialog("locale_choice_result", results.response.entity);
            } else {
                session.error(err);
            }
        });
    }
]);

// shared dialogs
bot.dialog('confirmAndAskImage', [
    function (session, args) {
        builder.Prompts.confirm(session, 
            args,
            {
                listStyle: builder.ListStyle.button, 
                maxRetries: 3
            });        
    },
    function (session, results) {
        if(results.response) {
            session.beginDialog('askImage');
        } else if (results.response === false){
            session.endConversation('wrong_understanding');
        } else {
            session.endConversation('over_attemps');
        }
    }
]);

var fromUrl;
var fromUpload;

bot.dialog('askImage', [
    function (session) {
        fromUrl = session.localizer.gettext(session.preferredLocale(), 'from_url');
        fromUpload = session.localizer.gettext(session.preferredLocale(), 'from_upload'); 
        builder.Prompts.choice(session, 
            'image_choice_prompt', 
            [fromUrl, fromUpload],
            {
                listStyle: builder.ListStyle.button,
                maxRetries: 3,
                retryPrompt: 'invalid_choice'
            });
    },
    function (session, results) {
        if (!results.response) {
            session.endConversation('over_attemps');
        }
        else {
            session.dialogData.image = {};
            switch (results.response.entity) {
                case fromUrl:
                    session.dialogData.image.from = imageFrom.Url;
                    builder.Prompts.text(session, 'image_choice_url');
                    break;
                case fromUpload:
                    session.dialogData.image.from = imageFrom.Upload;
                    builder.Prompts.attachment(session, 'image_choice_upload');
                    break;
            }
        }
    },
    function (session, results) {
        session.dialogData.image.payload = results.response;
        session.endDialogWithResult({response: session.dialogData.image});
    }
]);



function showThumbnail(session, data) { 
    var dataBody = data.body;
    var dataType = data.type;
    // display image from binary
    var base64 = new Buffer(dataBody, 'binary').toString('base64');
    var imageUrl = "data:" + dataType + ";base64," + base64;
    var msg = new builder.Message(session)
        .text('thumbnail_result')
        .attachments([{
            contentUrl: imageUrl,
            contentType: dataType
        }]);
    session.endDialog(msg);  
};

function showText(session, data) {    
    if(data.body && data.body.words) {
        var adaptiveCard = {
            'contentType': 'application/vnd.microsoft.card.adaptive',
            'content': {
                '$schema': 'http://adaptivecards.io/schemas/adaptive-card.json',
                'type': 'AdaptiveCard',
                'version': '1.0',
                'body': [
                    {
                        "type": "TextBlock",
                        "text": data.body.words,
                        "wrap": true,
                        "color": "accent"
                    }
                ]
            }
        };
        var msg = new builder.Message(session)
            .text('extracttext_result')
            .addAttachment(adaptiveCard);
        session.endDialog(msg);
    } else {
        session.endDialog('extracttext_fail');
    }    
};

function showAnalysis(session, data) {
    if(data.body) {
        var adaptiveCard = {
            'contentType': 'application/vnd.microsoft.card.adaptive',
            'content': {
                '$schema': 'http://adaptivecards.io/schemas/adaptive-card.json',
                'type': 'AdaptiveCard',
                'version': '1.0',
                'body': [
                    {
                        "type": "FactSet",
                        "facts": [
                            {
                                "title": "Categories",
                                "value": data.body.categories
                            },
                            {
                                "title": "Celebrities",
                                "value": data.body.detail
                            },
                            {
                                "title": "Tags",
                                "value": data.body.tags
                            },
                            {
                                "title": "Description",
                                "value": data.body.description
                            },
                            {
                                "title": "Adult Content",
                                "value": data.body.isAudltContent
                            },
                            {
                                "title": "Metadata",
                                "value": data.body.metadata
                            },
                            {
                                "title": "Colors",
                                "value": data.body.color
                            }
                        ]
                    }
                ]
            }
        };
        var msg = new builder.Message(session)
            .text('analyze_result')
            .addAttachment(adaptiveCard);
        session.endDialog(msg); 
    } else {
        session.endDialog('analyze_fail');
    }
};

function handleErrorResponse(session, error) {
    var clientErrorMessage = 'azai_invoke_fail';
    if (error.message && error.message.indexOf('Access denied') > -1) {
        clientErrorMessage += "\n" + error.message;
    }

    console.error(error);
    session.endDialog(clientErrorMessage);
};