/**
 * Created by jbuisine on 09/02/17.
 */

var app = require('./../../app');
var io = app.io;

var express = require('express');
var router = express.Router();
var utilities = require('./../utilities');
const spawn = require('child_process').spawn;
var path = require('path')


const readline = require('readline');
const fs = require('fs-extra');
const multer  = require('multer');
//const upload = multer({dist: 'uploads/'});

const templatesPath = './views/templates/';

const solsPath = './../resources/solutions/';
const albumsTypePath = './../resources/data/';
const buildTemplateFile = './../utilities/buildAlbum.py';;
const buildTagPath = './../utilities/tag-clarifai.py';;
const buildInfoPath = './../utilities/extractInfo.py';

router.get('/templates/:name', function (req, res) {

    utilities.readFileContent(templatesPath + req.params.name + "/info.txt").then(function(dataFile){

        var currentSol = dataFile.substr(dataFile.lastIndexOf("/") + 1);

        var templates = utilities.getDirectories(templatesPath);

        var template = req.params.name;

        var albumsType = utilities.getFiles(albumsTypePath + template);

        if(templates.indexOf(req.params.name) !== -1){

            utilities.filePathExists(templatesPath + template + '/page_0.ejs').then(function(exists) {

               if(exists){
                   res.redirect("/templates/"+template + "/0");
               }
               else{
                   res.render('index', {
                       page: "template",
                       templateName: template,
                       templates: utilities.getDirectories(templatesPath),
                       albumsType: albumsType,
                       solutions: utilities.getFiles(solsPath + template + "/" + albumsType[0].replace('.json', '')),
                       currentSolution: currentSol
                   });
               }
            });

        }else{
            res.redirect('error');
        }
    });
});

router.get('/templates/:name/:id', function (req, res) {

    var templates = utilities.getDirectories(templatesPath);

    var template = req.params.name;
    var id = req.params.id;
    if(templates.indexOf(req.params.name) !== -1){

        utilities.filePathExists(templatesPath + template + '/page_' + id + '.ejs').then(function(exists) {

            if(exists){
                utilities.readFileContent(templatesPath + template + "/info.txt").then(function(dataFile) {

                    var currentSol = dataFile.substr(dataFile.lastIndexOf("/") + 1);
                    var albumsType = utilities.getFiles(albumsTypePath + template);
                    res.render('index', {
                        page: "template",
                        templateName: template,
                        idPage: id,
                        templates: templates,
                        albumsType: albumsType,
                        solutions: utilities.getFiles(solsPath + template + "/" + albumsType[0].replace('.json', '')),
                        currentSolution: currentSol
                    });
                });
            } else{
                res.redirect("/templates/"+template);
            }
        }).catch(function(e) { throw e; });

    }else{
        res.redirect('/error');
    }
});

router.post('/generate-album', function (req, res) {

    var template = req.body.templateName;
    var solutionFile = req.body.solutionFile;
    var albumType = req.body.albumType;
    var lineFile = req.body.selectSolutionsGenerate;

    var templates = utilities.getDirectories(templatesPath);

    if (templates.indexOf(template) !== -1) {

        var solutionPath = solsPath + template + "/" + albumType.replace('.json', '') + "/" + solutionFile;
        var python = spawn('python', [buildTemplateFile, solutionPath, albumType, template, lineFile]);

        python.stdout.on('data', function (data) {
            io.sockets.emit('uploadProgress', data.toString());
            console.log('stdout: ' + data.toString());
        });

        python.stderr.on('data', function (data) {
            console.log('stderr: ' + data.toString());
        });

        python.on('close', function() {
            res.redirect('/templates/' + template);
        });

    } else {
        res.redirect('/error');
    }
});

router.post('/load-solutions', function (req, res) {

    var albumType = req.body.albumType;
    var template = req.body.templateName;

    var completePath = solsPath + template + "/" + albumType.replace('.json', '');
    var solutions = utilities.getFiles(completePath);

    res.send(solutions);
});

router.post('/load-solution-content', function (req, res) {
    var albumType = req.body.albumType;
    var template = req.body.templateName;
    var solutionFile = req.body.solutionFile;

    var solutionPath = solsPath + template + "/" + albumType.replace('.json', '') + "/" + solutionFile;

    var lineReader = readline.createInterface({
        input: fs.createReadStream(solutionPath)
    });

    var contentFile = [];

    lineReader.on('line', function (line) {

        contentFile.push(line.split(','));

    }).on('close', function(){
        res.send(contentFile);
    });
});

// Routes associated to the creation of template
router.get('/create-template', function(req, res){
  res.render('index', {
      page: "create-template",
      templates: utilities.getDirectories(templatesPath)
  });
});


router.post('/template-save-image', function (req, res) {

    var filename = "rIMG_1940";

    var storage = multer.diskStorage({
        destination: function (req, file, cb) {
            var templateName = req.body.templateName;
            var pathFolder = templatesPath + templateName + "/img";
            var files = utilities.getFiles(pathFolder);
            fs.mkdirsSync(pathFolder);

            if(files)
                console.log(files.slice(-1));

            cb(null, pathFolder);
        },
        filename: function (req, file, cb) {

            //cb(null, filename + ".jpg")
        }
    });

    var upload = multer({ storage: storage }).single('photo');

    upload(req, res, function (err) {
        if(err)
            res.status(406);
        else
            res.status(200);

        res.send();
    })
});

router.post('/generation-info-photo', function (req, res) {

    var template = req.body.templateName;

    var buildTag = spawn('python', [buildTagPath, templatesPath + template]);

    buildTag.on('close', function() {

        var buildInfoFile = spawn('python', [buildInfoPath, templatesPath + template]);

        buildInfoFile.on('close', function() {
            res.redirect('/templates/' + template);
        });
    });
});

module.exports = router;
