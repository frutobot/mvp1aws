'use strict';


const dynamodb = require('./dynamodb').client;


const maxSaveObjSize = 40000;

const failed = function(message, callback) {
    console.error('Validation Failed - ', message);
    callback(null, {
        statusCode: 400,
        headers: { 
            'Content-Type': 'text/plain',
            'Access-Control-Allow-Headers' : 'Content-Type',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT,DELETE'
        },
        body: 'Cannot create data object: ' + message,
    });
    return;
};

module.exports.create = (event, context, callback) => {
    var fstep = "start";
    try {
        const types = new Set(["subscription","product","entitlement","org","site"]);
        const timestamp = new Date().getTime();
        const data = JSON.parse(event.body);
        if (!data || (typeof data.type !== 'string')) {
            failed('Object type not found');
        }
        if(!types.has(data.type)) {
            failed('Object type incorrect');
        }

        // verify object size - refuse grater than max
        if(event.body.length > maxSaveObjSize) {
            failed('Object size incorrect');
        }

        var newObj = {};
        newObj.id = timestamp;
        newObj.type = data.type;
        newObj.pk = data.pk ? data.pk : "-";

        newObj.createdAt = timestamp;
        newObj.updatedAt = timestamp;
        newObj.updateBy = data.ident;

        //var sourceIp = event.requestContext.identity.sourceIp;
        //var agent = event.requestContext.identity.userAgent;

        var params = {
            TableName: process.env.DYNAMODB_TABLE,
            Item: newObj
        };
        fstep = "dynamodb.put";
        // write the item to the database
        dynamodb.put(params, (error) => {
            // handle potential errors
            if (error) {
                console.error(error);
                callback(null, {
                    statusCode: error.statusCode || 501,
                    headers: { 
                        'Content-Type': 'text/plain',
                        'Access-Control-Allow-Headers' : 'Content-Type',
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT,DELETE'
                    },
                    body: 
                        'Couldn\'t create the db item.\n' + 
                        error.message + "\n" +
                        error.stack + "\n" +
                        JSON.stringify(params) +"\n"
                });
                return;
            }

            // create a response
            const response = {
                statusCode: 200,
                headers: { 
                    'Content-Type': 'text/plain',
                    'Access-Control-Allow-Headers' : 'Content-Type',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT,DELETE'
                },
                body: JSON.stringify(params.Item),
            };
            callback(null, response);
        });

    } catch (error) {
        failed(fstep + ": " + error.message + (error.stack ? ("\r\n" + error.stack) : ""), callback);
    }
};
