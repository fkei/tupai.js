/**
 * @author <a href='bocelli.hu@gmail.com'>bocelli.hu</a>
 * @since tupai.js 0.1
 */
var fs = require('fs');
var path = require('path');
var ejs = require('ejs');
var mkdirp = require('mkdirp').sync;
var tupai = require(__dirname);

exports.make = function(target, options) {

    if(!tupai.isTupaiProjectDir()) {
        console.error('current dir is not a tupai project dir.');
        return undefined;
    }

    target = target || 'release';
    if(['debug', 'release', 'clean'].indexOf(target) < 0) {
        console.error('known target (' + target+')');
        process.exit(1);
    }

    var tupaiConfig = tupai.getConfig();
    var outputJs = path.join(tupaiConfig.web, 'js', tupaiConfig.name + '.js');
    if(target === 'clean') {
        console.log('unlink ' + outputJs);
        if(fs.existsSync(outputJs)) {
            fs.unlinkSync(outputJs);
        }

        console.log('unlink ' + tupaiConfig.gen);
        tupai.rmdirSync(tupaiConfig.gen);
        return;
    }

    var meOptions = {
       classPath: [
           tupaiConfig.sources,
           tupaiConfig.genTemplates,
           tupaiConfig.genConfigs
       ],
       output: path.join(tupaiConfig.gen, tupaiConfig.name + '.js')
    };

    console.log('gen template files:');
    console.log('    ' + tupaiConfig.templates + ' -> ' + tupaiConfig.genTemplates);
    tupai.compileTemplates(tupaiConfig.templates, tupaiConfig.genTemplates, '', {
        onStdoutData: function(data) {
            //console.log("    " + data.toString().split('\n')[0]);
        },
        end: function(code) {
            if(code != 0) {
                console.error('gen template files fails');
                return;
            }
            console.log('gen configs:');
            tupai.compileConfigSync(
                tupaiConfig.configs,
                tupaiConfig.genConfigs,
                'Config'
            );
            console.log('consistency check: ');
            tupai.merge('check', meOptions, {
                end: function(code) {
                    // merge classes to one file
                    if(code == 0) {
                        console.log('    ok');
                    } else {
                        console.error('    ng');
                        return;
                    }
                    console.log('merge classes: ');
                    tupai.merge('merge', meOptions, {
                        end: function() {
                            var inputJs = meOptions.output;
                            if(target === 'debug') {
                                // copy it
                                console.log('copy: ');
                                console.log('    ' + inputJs + ' -> ' + outputJs);
                                fs.createReadStream(inputJs)
                                .pipe(fs.createWriteStream(outputJs));
                            } else {
                                // compress js file
                                console.log('compress: ');
                                console.log('    ' + inputJs + ' -> ' + outputJs);
                                tupai.compress(
                                    inputJs,
                                    {
                                        type: 'js',
                                        output: outputJs
                                    }
                                );
                            }
                        }
                    });
                }
            });
        }
    });
}

