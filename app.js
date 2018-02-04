const http = require('http');
const bodyParser = require('body-parser');
const express = require('express');
const fs        = require('fs');
const app = express();
const AWS = require('aws-sdk');
AWS.config.region = 'us-west-2';
const kinesisvideo = new AWS.KinesisVideo({apiVersion: '2017-09-30'});
const kinesisvideomedia = new AWS.KinesisVideoMedia();
const rekognition = new AWS.Rekognition();
const firehose = new AWS.Firehose();
// const ss = require('socket.io-stream');
const stream = require('stream');
const kinesisvideoarchivedmedia = new AWS.KinesisVideoArchivedMedia();
const httpServer = http.createServer(app);
const io = require('socket.io')(httpServer);
const models = require('./models');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

/**
 * Allow CORS all routes.
 */
app.use('/', (req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE');
    res.header('Access-Control-Expose-Headers', 'Content-Length');
    res.header('Access-Control-Allow-Headers', 'Accept, Authorization, Content-Type, X-Requested-With, Range');
    next();
});

let socketArray = [];

io.on('connect', (socket) => {

    console.log("connected" + socket);

    socketArray.push(socket);

    socket.on('disconnect', () => {
        console.log("discon");
        socketArray.splice(socketArray.indexOf(socket), 1);
    });

    socket.on('identifyScene', (data) => {
        socket.sceneId = data.sceneId;
        console.log('connected');
        socket.emit('getScene');
    });

    socket.on('imageData', (data) => {

        let buff = new Buffer(data.image
            .replace(/^data:image\/(png|gif|jpeg);base64,/,''), 'base64');
        let params = {
            Image: {
                Bytes: buff
            },
            Attributes: [
                'ALL'
            ]
        };

        rekognition.detectFaces(params, function(err, data) {
            if (err) console.log(err, err.stack); // an error occurred
            else{
                let updateData = {
                    sceneId: socket.sceneId,
                    ai: data
                };
                // models.seen.create({
                //     userId: req.body.userId,
                //     faceImage: req.s3Name,
                //     pin: req.body.pin
                // }).then(Seen => {
                //     console.log(Seen);
                // });
                console.log(data);
                socket.broadcast.emit('sceneUpdate', updateData);
            }
        });

        let s3 = new AWS.S3();
        let uploadParams = { Bucket: 'mangohack', Body: buff, Key: socket.sceneId+ "_latest.jpg" , ACL: "public-read"};

        s3.upload (uploadParams, function (err, data) {
            if (err) console.log("Error", err);
        });
    });
});


// app.get('/cloudCam', (req,res) => {
//     let params = {
//         DeliveryStreamName: 'brad', /* required */
//         DeliveryStreamType: 'KinesisStreamAsSource',
//         ExtendedS3DestinationConfiguration: {
//             BucketARN: 'arn:aws:s3:::hackuf', /* required */
//             RoleARN: 'arn:aws:iam::777575147151:role/kinesis', /* required */
//         },
//         KinesisStreamSourceConfiguration: {
//             KinesisStreamARN: 'arn:aws:kinesisvideo:us-west-2:777575147151:stream/brendanpi/1517638184103', /* required */
//             RoleARN: 'arn:aws:iam::777575147151:role/root' /* required */
//         }
//     };
//     firehose.createDeliveryStream(params, function(err, data) {
//         if (err) console.log(err, err.stack); // an error occurred
//         else     console.log(data);           // successful response
//     });
// });
// io.on('connect', (socket) => {
//     console.log("connected" + socket);
//     socket.on('cam', (data) => {
//         console.log("cam hit " + data);
//         console.log('hi');
//         let params = {
//             StartSelector: {
//                 StartSelectorType: "EARLIEST",
//             },
//             //in future send data in 2 below fields after get
//             StreamARN: 'arn:aws:kinesisvideo:us-west-2:777575147151:stream/brendanpi/1517638184103',
//             StreamName: 'brendanpi'
//         };
//         kinesisvideomedia.getMedia(params, function(err, data) {
//             if (err){
//                 console.log(err, err.stack); // an error occurred
//                 socket.emit(err);
//             }
//             else {
//                 console.log(data);// successful response
//                 fs.readFile(data, () => {
//                     ss(socket).on('getCam', function(stream, data) {
//                         let filename = path.basename(data.name);
//                         stream.pipe(fs.createWriteStream(filename));
//                     });
//
//                 });
//
//
//                 // socket.emit('camStream', (data) =>{
//                 //
//                 // });
//
//             }
//         });
//     })
// });
// app.get('/endPoint', (req, res) => {
//     let params = {
//         APIName: 'GET_MEDIA_FOR_FRAGMENT_LIST', /* required */
//         StreamARN: 'arn:aws:kinesisvideo:us-west-2:777575147151:stream/brendanpi/1517638184103'
//     };
//     kinesisvideo.getDataEndpoint(params, function(err, data) {
//         if (err) console.log(err, err.stack); // an error occurred
//         else {
//             console.log(data);           // successful response
//             let uri = data.DataEndpoint;
//             let i= 100;
//             let download = function(uri, filename, callback){
//                 do{
//                     console.log(i);
//                     i--;
//                     request.head(uri, function(err, res, body){
//                         console.log('content-type:', res.headers['content-type']);
//                         console.log('content-length:', res.headers['content-length']);
//                         request(uri).pipe(fs.createWriteStream(filename)).on();
//                     });
//                 }while(i !== 0);
//             };
//         }
//     });
// });
// app.get('/allCams', (req, res) => {
//     kinesisvideo.listStreams({}, function(err, data) {
//         if (err){
//             console.log(err, err.stack); // an error occurred
//             return res.json(err);
//         }
//         else {
//             console.log(data);// successful response
//             return res.json(data);
//         }
//     });
// });
// app.get('/cam', (req,res) => {
//     let params = {
//         StartSelector: { /* required */
//             StartSelectorType: "EARLIEST",//FRAGMENT_NUMBER | SERVER_TIMESTAMP | PRODUCER_TIMESTAMP | NOW | EARLIEST | CONTINUATION_TOKEN, /* required */
//         },
//         StreamARN: 'arn:aws:kinesisvideo:us-west-2:777575147151:stream/brendanpi/1517638184103',
//         StreamName: 'brendanpi'
//     };
//     kinesisvideomedia.getMedia(params, function(err, data) {
//         if (err){
//             console.log(err, err.stack); // an error occurred
//             return res.json(err);
//         }
//         else {
//             console.log(data);// successful response
//             const r = fs.createReadStream(data);
//
//             return res.json(data);
//         }
//     });
// });
// app.get('/cambam', (req,res) => {
//     let params = {
//         StreamName: 'brendanpi', /* required */
//         FragmentSelector: {
//             FragmentSelectorType: 'SERVER_TIMESTAMP', /* required */
//             TimestampRange: { /* required */
//                 EndTimestamp: new Date(), /* required */
//                 StartTimestamp: new Date('Fri Feb 2 2018 16:00:00 GMT-0800 (PST)') /* required */
//             }
//         },
//         MaxResults: 1000,
//         NextToken: 'STRING_VALUE'
//     };
//     kinesisvideoarchivedmedia.listFragments(params, function(err, data) {
//         if (err) console.log(err, err.stack); // an error occurred
//         else  {
//             console.log(data);           // successful response
//             res.json(data);
//         }
//     });
// });
// app.get('/camsam', (req,res) => {
//     let params = {
//         StreamName: 'brendanpi', /* required */
//         FragmentSelector: {
//             FragmentSelectorType: 'PRODUCER_TIMESTAMP', /* required */
//             TimestampRange: { /* required */
//                 EndTimestamp: new Date('2018-02-03'), /* required */
//                 StartTimestamp: new Date('2018-02-01') /* required */
//             }
//         },
//         MaxResults: 10000,
//         NextToken: 'STRING_VALUE'
//     };
//     kinesisvideoarchivedmedia.listFragments(params, function(err, data) {
//         if (err) console.log(err, err.stack); // an error occurred
//         else     console.log(data);           // successful response
//     });
//
//
//     // var params = {
//     //     Fragments: [ /* required */
//     //         'STRING_VALUE',
//     //         /* more items */
//     //     ],
//     //     StreamName: 'STRING_VALUE' /* required */
//     // };
//     // kinesisvideoarchivedmedia.getMediaForFragmentList(params, function (err, data) {
//     //     if (err) console.log(err, err.stack); // an error occurred
//     //     else     console.log(data);           // successful response
//     // });
// });

function refreshTime(){
    console.log("hifdfd");
    if(socketArray.length > 0){
        for(let i=0; i< socketArray.length; i++){
            socketArray[i].emit('getScene');
        }
    }
}


httpServer.listen(8080, () => {
    console.log('http server running.');
}, setInterval(refreshTime, 7500));