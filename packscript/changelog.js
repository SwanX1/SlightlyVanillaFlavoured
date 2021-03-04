'use strict';

const chalk = require('chalk');
const packagejson = require('./package.json');
const fs = require('fs');
const options = {
  debug: true,
  query: ''
};
const qoa = require('qoa');

// Warn about node deprecation
let nodeColor;
const nodeVersion = process.version.split('.')[0];
const deprecations = {
  'v0': 1483210945000, // 2016-Dec-31
  'v4': 1525111345000, // 2018-Apr-30
  'v5': 1467309745000, // 2016-Jun-30
  'v6': 1554141745000, // 2019-Apr-01
  'v7': 1498845745000, // 2017-Jun-30
  'v8': 1577818945000, // 2019-Dec-31
  'v9': 1530381745000, // 2018-Jun-30
  'v10': 1619730000000, // 2021-Apr-30
  'v11': 1561917745000, // 2019-Jun-30
  'v12': 1651266000000, // 2022-Apr-30
  'v14': 1682802000000, // 2023-Apr-30
  'v15': 1622494800000, // 2021-Jun-01
  'v16': 1714424400000, // 2024-Apr-30
};
const currentDate = Date.now();
if (currentDate > deprecations[nodeVersion])
  nodeColor = 'red';
else if (currentDate - 2629743000 > deprecations[nodeVersion]) // If deprecated within a month
  nodeColor = 'yellow';

let nodeDeprecationWarning;
if (nodeColor === 'red')
  nodeDeprecationWarning = chalk`[{red FATAL}] Your NodeJS version ({red ${nodeVersion}}) is no longer supported, please update NodeJS.`;
else if (nodeColor === 'yellow')
  nodeDeprecationWarning = chalk`[{yellow WARNING}] Your NodeJS version ({yellow ${nodeVersion}}) is going to no longer be supported within a month, consider updating.`;

if (nodeDeprecationWarning) {
  console.error(nodeDeprecationWarning);
  if (nodeColor === 'red') {
    process.exit(1);
  }
}

let argv;
if (process.argv.slice(2).length === 0) {
  (async () => {
    let answer;
    let quit = false;
    while (!quit) {
      process.stdout.moveCursor(0);
      options.query = chalk`{grey $} `;
      answer = (await qoa.prompt([{
        type: 'interactive',
        query: options.query,
        handle: 'action',
        symbol: '>',
        menu: [
          'compare',
          'help',
          'exit',
          chalk`{${options.debug ? 'green' : 'red'} debug}`,
        ]
      }])).action;
      process.stdout.moveCursor(0, -1);
      process.stdout.clearLine();
      process.stdout.moveCursor(0, -1);
      if (stripANSI(answer) === 'debug') {
        options.debug = !options.debug;
      } else if (answer === 'help') {
        let done = false;
        while (!done) {
          options.query = chalk`{grey $} help {grey {underline [ARGUMENT]}} ${options.debug ? chalk`{grey --debug}` : '' }`;
          answer = (await qoa.prompt([{
            type: 'interactive',
            query: options.query,
            handle: 'action',
            symbol: '>',
            menu: [
              chalk`{italic none}`,
              'compare',
              chalk`{italic back}`
            ]
          }])).action;
          process.stdout.moveCursor(0, -1);
          process.stdout.clearLine();
          process.stdout.moveCursor(0, -1);
          process.stdout.clearLine();
          if (stripANSI(answer) !== 'back') process.stdout.write(chalk`{grey $} help ` + (stripANSI(answer) === 'none' ? '' : answer));
          process.stdout.moveCursor(0);
          if (stripANSI(answer) === 'none') {
            helpFlag();
          } else if (answer === 'compare') {
            helpArgument('compare');
          } else if (stripANSI(answer) === 'back') {
            done = true;
          }
        }
      } else if (answer === 'compare') {
        let done;
        let notexist;
        
        done = false;
        notexist = false;
        let filename1;
        while (!done) {
          process.stdout.write(chalk`{grey $} compare {grey {underline [FILE1]} [FILE2]} ${options.debug ? chalk`{grey --debug}` : ''}`);
          if (notexist) {
            process.stdout.write(chalk`\n{bgRed ERROR} file {yellow ${filename1}} doesn't exist`);
          }
          process.stdout.write('\n');
          filename1 = (await qoa.prompt([{
            type: 'input',
            query: chalk`{grey File 1} > `,
            handle: 'action'
          }])).action;
          process.stdout.moveCursor(0, -1);
          process.stdout.clearLine();
          process.stdout.moveCursor(0, -1);
          process.stdout.clearLine();
          if (notexist) {
            process.stdout.moveCursor(0, -1);
            process.stdout.clearLine();
          }
          if (filename1.startsWith('http://') || filename1.startsWith('https://')) {
            done = true;
          } else if (fs.existsSync(filename1)) {
            done = true;
          } else {
            notexist = true;
          }
        }
        done = false;
        notexist = false;
        let filename2;
        while (!done) {
          process.stdout.write(chalk`{grey $} compare {grey ${filename1} {underline [FILE2]}} ${options.debug ? chalk`{grey --debug}` : ''}`);
          if (notexist) {
            process.stdout.write(chalk`\n{bgRed ERROR} file {yellow ${filename2}} doesn't exist`);
          }
          process.stdout.write('\n');
          filename2 = (await qoa.prompt([{
            type: 'input',
            query: chalk`{grey File 2 } > `,
            handle: 'action'
          }])).action;
          process.stdout.moveCursor(0, -1);
          process.stdout.clearLine();
          process.stdout.moveCursor(0, -1);
          process.stdout.clearLine();
          if (notexist) {
            process.stdout.moveCursor(0, -1);
            process.stdout.clearLine();
          }
          if (filename2.startsWith('http://') || filename2.startsWith('https://')) {
            done = true;
          } else if (fs.existsSync(filename2)) {
            done = true;
          } else {
            notexist = true;
          }
        }
        process.stdout.write('\n');
        quit = true;
        compare(filename1, filename2);
      } else if (answer === 'exit') {
        process.exit(0);
      }
    }
  })();
} else {
  argv = parseArguments(process.argv.slice(2), {
    "debug": {
      "alias": ["--debug", "--verbose"],
      "type": "flag"
    },
    "help_flag": {
      "alias": ["--help"],
      "type": "flag"
    },
    "help_argument": {
      "alias": ["help"],
      "type": "subcommand",
      "args": ["subcommand"]
    },
    "compare": {
      "alias": ["compare"],
      "type": "subcommand",
      "args": ["file1", "file2"]
    }
  });
  options.debug = argv.debug;
}

const logger = new (class Logger {
  constructor() {
  }
  
  debug(...args) {
    if (this.debuglevel) {
      console.debug(...args);
    }
  }
  
  log(...args) {
    this.info(...args);
  }
  
  info(...args) {
    if (this.debuglevel) {
      console.info(...args);
    }
  }
  
  quiet(...args) {
    console.log(...args);
  }
  
  error(...args) {
    console.error(...args)
  }
  
  get debuglevel() {
    return options.debug;
  }
}
)();

if (argv?.help_flag) helpFlag();

function helpFlag() {
  logger.quiet(stripSpaces(chalk`
  Usage: node {yellow ${packagejson.main}} {gray [OPTIONS...]} {gray [SUBCOMMAND]}
  
  compare {gray [FILE1] [FILE2]}   Compares two {yellow manifest.json} files and outputs a changelog
  
    help, --help              Shows this screen
    help {gray [SUBCOMMAND]}         Shows additional help for subcommands
    
    -q, --quiet               Quiet logging
    --verbose, --debug        Verbose logging, overrides quiet logging\
  `));
  // show arch in red if it is 32-bit
  const archColor = ['arm', 'ia32', 'ppc', 's390', 'x32'].includes(process.arch) ? 'red' : 'white';
  if (!nodeColor) nodeColor = 'white';
  logger.debug(stripSpaces(chalk`  Debug info:
    {gray System} ${process.platform},{${archColor} ${process.arch}}
    {gray NodeJS} {${nodeColor} ${process.versions.node}}
    {gray Script} ${packagejson.version}
  `));
  process.stdout.write('\n');
  process.exit(0);
}

if (argv?.help_argument && typeof argv.help_argument[0] !== 'undefined') helpArgument(argv.help_argument[0]);

function helpArgument(helpArgument) {
  switch (helpArgument) {
    case 'compare':
    logger.quiet(stripSpaces(chalk`
    Usage: node {yellow ${packagejson.main}} {gray [OPTIONS...]} compare {gray [FILE1] [FILE2]}
    Description: Compares two {yellow manifest.json} files and outputs a changelog
    
    FILE1, FILE2 - Paths / URLs to files
    
    Examples:
      {gray $} node {yellow ${packagejson.main}} compare {underline ./manifest-old.json} {underline ./manifest.json}
      {gray $} node {yellow ${packagejson.main}} compare {underline https://raw.githubusercontent.com/master/manifest.json} {underline ./manifest.json}
    `));
    break;
    default:
    logger.quiet(stripSpaces(chalk`
    Usage: node {yellow ${packagejson.main}} {gray [OPTIONS...]} {gray [SUBCOMMAND]}
    
      compare {gray [FILE1] [FILE2]}   Compares two {yellow manifest.json} files and outputs a changelog
      
      help, --help              Shows this screen
      help {gray [SUBCOMMAND]}         Shows additional help for subcommands
      
      -q, --quiet               Quiet logging
      --verbose, --debug        Verbose logging, overrides quiet logging
    `));
    // show arch in red if it is 32-bit
    const archColor = ['arm', 'ia32', 'ppc', 's390', 'x32'].includes(process.arch) ? 'red' : 'white';
    if (!nodeColor) nodeColor = 'white';
    logger.debug(stripSpaces(chalk`    Debug info:
    {gray System} ${process.platform},{${archColor} ${process.arch}}
    {gray NodeJS} {${nodeColor} ${process.versions.node}}
    {gray Script} ${packagejson.version}
    `))
    break;
  }
  process.stdout.write('\n');
  process.exit(0);
}

const signals = ['beforeExit', 'uncaughtException', 'serverError', 'SIGTSTP', 'SIGQUIT', 'SIGHUP', 'SIGTERM', 'SIGINT', 'SIGUSR2'];
signals.forEach((signal) => process.on(signal, () => {
  logger.info('Shutting down...');
  process.stdout.write('\x1b[?25h');
  process.exit();
}));
const ph = require("path");

const https = require("https");
const cf = (() => {
  const exportobj = {};
  const querystring = require("querystring");
  
  const base_url = "https://addons-ecs.forgesvc.net/api/v2/addon/";
  
  function basic_conversion_function(object) {
    return object;
  }
  
  function innerGet(url, options = {}, conversionFunction = basic_conversion_function, PARSE = true) {
    return new Promise((resolve, reject) => {
      if (Object.keys(options).length)
      url += "&" + querystring.stringify(options);
      https.get(url, function (response) {
        if (response && response.statusCode === 200) {
          let data = "";
          response.on("data", (chunk) => {
            data += chunk;
          });
          
          response.on("end", () => {
            if (PARSE) resolve(conversionFunction(JSON.parse(data)));
            else resolve(conversionFunction(data));
          });
        } else {
          reject(response.statusCode);
        }
      });
    });
  }
  
  exportobj.SORT_TYPES = {
    FEATURED: 0, // Sort by Featured
    POPULARITY: 1, // Sort by Popularity
    LAST_UPDATE: 2, // Sort by Last Update
    NAME: 3, // Sort by Name
    AUTHOR: 4, // Sort by Author
    TOTAL_DOWNLOADS: 5, // Sort by Total Downloads
  };
  
  exportobj.DEPENDENCY_TYPE = {
    EMBEDDED_LIBRARY: 1,
    OPTIONAL: 2,
    REQUIRED: 3,
    TOOL: 4,
    INCOMPATIBLE: 5,
    INCLUDE: 6
  }
  
  exportobj.getMods = function (options = {}, callback) {
    if (options && typeof options === "function") {
      callback = options;
      options = {};
    }
    let promise = innerGet(base_url + "search?gameId=432&sectionId=6", options, function (obj) {
      let mods = [];
      for (let m of Object.values(obj)) {
        mods.push(new Mod(m));
      }
      return mods;
    });
    if (callback && typeof callback === "function")
    promise.then(callback.bind(null, null), callback);
    return promise;
  };
  
  exportobj.getMod = function (identifier, callback) {
    let promise = innerGet(base_url + identifier, {}, function (obj) {
      return new Mod(obj);
    });
    if (callback && typeof callback === "function")
    promise.then(callback.bind(null, null), callback);
    return promise;
  };
  
  exportobj.getModFiles = function (identifier, callback) {
    let promise = innerGet(base_url + identifier + "/files", undefined, function (obj) {
      let files = [];
      for (let f of Object.values(obj)) {
        files.push(new ModFile(f));
      }
      return files;
    });
    if (callback && typeof callback === "function")
    promise.then(callback.bind(null, null), callback);
    return promise;
  };
  
  exportobj.getModDescription = function (identifier, callback) {
    let promise = innerGet(base_url + identifier + "/description", undefined, function (obj) {
      return obj;
    }, false);
    if (callback && typeof callback === "function")
    promise.then(callback.bind(null, null), callback);
    return promise;
  };
  
  class ModFile {
    download(path, override = false, simulate = false, callback, url = this.download_url, tries = 10) {
      if (override && typeof override === "function") {
        callback = override;
        override = false;
      } else if (override && typeof override === "object") {
        override = override.override;
      }
      
      let promise = new Promise((resolve, reject) => {
        if (tries < 1) reject("Download canceled after 10 redirects.");
        if (!ph.isAbsolute(path)) reject("Path is not absolute.");
        if (fs.existsSync(path)) {
          if (override) fs.unlinkSync(path);
          else reject("File exists and override is false");
        }
        https.get(url, (response) => {
          if (response.statusCode >= 300 && response.statusCode < 400) {
            if (response.headers["location"])
            resolve(this.download(path, override, simulate, callback, response.headers["location"], tries - 1));
            return;
          } else if (response.statusCode !== 200) {
            reject("File couldn't be downloaded.");
          }
          if (simulate) {
            resolve(path);
            return;
          } else {
            response.pipe(fs.createWriteStream(path));
            response.on("end", () => {
              resolve(path);
            });
          }
        });
      });
      
      if (callback && typeof callback === "function")
      promise.then(callback.bind(null, null), callback);
      
      return promise;
    }
    __please_dont_hate_me(method, callback, dependencies) {
      let promise = new Promise((resolve, reject) => {
        let mods = [];
        let amount = dependencies.length;
        if (amount <= 0) {
          resolve([]);
        }
        for (let dep of dependencies) {
          method(dep.addonId)
          .then((res) => {
            mods.push(res);
            if (--amount === 0) {
              resolve(mods);
            }
          })
          .catch((err) => reject);
        }
      });
      if (callback && typeof callback === "function")
      promise.then(callback.bind(null, null), callback);
      
      return promise;
    }
    getDependencies(callback, categories = [1, 3]) {
      if (typeof callback == "array")
      categories = callback;
      
      let dependenciesToLoad = this.mod_dependencies.filter(mod => {
        return categories.includes(mod.type);
      })
      
      return this.__please_dont_hate_me(curseforge.getMod, callback, dependenciesToLoad);
    }
    getDependenciesFiles(callback, categories = [1, 3]) {
      if (typeof callback == "array")
      categories = callback;
      let dependenciesToLoad = this.mod_dependencies.filter(mod => {
        return categories.includes(mod.type);
      })
      return this.__please_dont_hate_me(curseforge.getModFiles, callback, dependenciesToLoad);
    }
    constructor(file_object) {
      this.id = file_object.id;
      this.minecraft_versions = file_object.gameVersion;
      this.file_name = file_object.file_name;
      this.displayName = file_object.displayName;
      this.file_size = file_object.fileLength;
      this.timestamp = file_object.fileDate;
      this.release_type = file_object.releaseType;
      this.download_url = file_object.downloadUrl;
      this.downloads = file_object.download_count;
      this.mod_dependencies = file_object.dependencies || [];
      this.alternate = file_object.isAlternate;
      this.alternate_id = file_object.alternateFileId;
      this.available = file_object.isAvailable;
    }
  }
  class Mod {
    getFiles(options, callback) {
      return exportobj.getModFiles(this.id, options, callback);
    }
    constructor(mod_object) {
      this.id = mod_object.id;
      this.name = mod_object.name;
      this.authors = mod_object.authors;
      this.attachments = mod_object.attachments;
      this.url = mod_object.websiteUrl;
      this.summary = mod_object.summary;
      this.defaultFileId = mod_object.defaultFileId;
      this.downloads = mod_object.downloadCount;
      this.latestFiles = [];
      for (let f of mod_object.latestFiles) {
        this.latestFiles.push(new ModFile(f));
      }
      this.key = mod_object.slug;
      this.featured = mod_object.isFeatured;
      this.popularityScore = mod_object.popularityScore;
      this.gamePopularityRank = mod_object.gamePopularityRank;
      this.primaryLanguage = mod_object.primaryLanguage;
      this.logo = this.attachments[0];
      this.updated = mod_object.dateModified;
      this.created = mod_object.dateCreated;
      this.released = mod_object.dateReleased;
      this.available = mod_object.isAvailable;
      this.experimental = mod_object.isExperimental;
    }
  }
  return exportobj;
})();

if (argv?.compare) {
  if (typeof argv.compare[0] !== 'undefined' && typeof argv.compare[1] === 'undefined') {
    logger.error(chalk`Argument 'compare' required two arguments, given one`);
    process.exit(3);
  }
  if (typeof argv.compare[0] !== 'undefined') compare(argv.compare[0], argv.compare[1]);
}

async function compare(filename1, filename2) {
  let error1 = false;
  let error2 = false;
  let file1, file2;
  if (filename1.startsWith('https://')) {
    logger.debug(chalk`Fetching {yellow ${filename1}}`);
    file1 = await new Promise(r => https.get(filename1, (res) => {
      if (res && res.statusCode === 200) {
        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => r(data.replace(/\r/g, '')));
      } else {
        logger.error(chalk`{yellow ${filename1}} returned a ${res.statusCode} status code`);
        error1 = true;
      }
    }));

  } else if (filename1.startsWith('http://')) {
    error1 = true;
    logger.error(chalk`Insecure HTTP is not supported.`)
  } else {
    logger.debug(chalk`Checking if {yellow ${filename1}} exists`);
    if (!fs.existsSync(filename1)) {
      error1 = true;
      logger.error(chalk`File {yellow ${filename1}} doesn't exist!`);
    }
    if (!error1) {
      file1 = fs.readFileSync(filename1);
    }
  }

  if (filename2.startsWith('https://')) {
    logger.debug(chalk`Fetching {yellow ${filename2}}`);
    file2 = await new Promise(r => https.get(filename2, (res) => {
      if (res && res.statusCode === 200) {
        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => r(data.replace(/\r/g, '')));
      } else {
        logger.error(chalk`{yellow ${filename2}} returned a ${res.statusCode} status code`);
        error2 = true;
      }
    }));

  } else if (filename2.startsWith('http://')) {
    error2 = true;
    logger.error(chalk`Insecure HTTP is not supported.`)
  } else {
    logger.debug(chalk`Checking if {yellow ${filename2}} exists`);
    if (!fs.existsSync(filename2)) {
      error2 = true;
      logger.error(chalk`File {yellow ${filename2}} doesn't exist!`);
    }
    if (!error2) {
      file2 = fs.readFileSync(filename2);
    }
  }

  if (!error1) {
    try {
      logger.debug(chalk`Parsing {yellow ${filename1}}`);
      file1 = JSON.parse(file1.toString());
    } catch (err) {
      error1 = true;
      logger.error(chalk`File {yellow ${filename1}} is not a valid JSON file`);
    }
  }
  if (!error2) {
    try {
      logger.debug(chalk`Parsing {yellow ${filename2}}`);
      file2 = JSON.parse(file2.toString());
    } catch (err) {
      error2 = true;
      logger.error(chalk`File {yellow ${filename2}} is not a valid JSON file`);
    }
  }
  if (!error1) {
    logger.debug(chalk`Verifying structure of {yellow ${filename1}}`);
    if (!verifyManifestFiles(file1, filename1)) {
      error1 = true;
      logger.error(chalk`File {yellow ${filename1}} is not a valid modpack manifest.json file`)
    }
  }
  if (!error2) {
    logger.debug(chalk`Verifying structure of {yellow ${filename2}}`);
    if (!verifyManifestFiles(file2, filename2)) {
      error2 = true;
      logger.error(chalk`File {yellow ${filename2}} is not a valid modpack manifest.json file`)
    }
  }
  if (error1 || error2) process.exit(4);
  const removed = [];
  const modified = [];
  const added = [];
  
  file1.files.forEach(project => {
    const comparableModified = file2.files.find(p => p.projectID === project.projectID);
    if (typeof comparableModified === 'undefined') {
      logger.debug(chalk`{red -} ${project.projectID}`);
      removed.push(project.projectID);
    } else {
      if (project.fileID !== comparableModified.fileID) {
        logger.debug(chalk`{blue ~} ${project.projectID}`);
        modified.push({ id: project.projectID, from: project.fileID, to: comparableModified.fileID });
      }
    }
  });
  
  file2.files.forEach(project => {
    const comparableModified = file1.files.find(p => p.projectID === project.projectID);
    if (typeof comparableModified === 'undefined') {
      logger.debug(chalk`{green +} ${project.projectID}`);
      added.push(project.projectID);
    }
  });
  
  const pending = [];
  const cache = {};
  
  for (const id of removed) {
    if (pending.includes(id)) continue;
    let index = pending.push(id) - 1;
    logger.debug(chalk`Fetching project {yellow ${id}}`);
    cf.getMod(id, (err, mod) => {
      logger.debug(chalk`Fetched project {yellow ${id}}`);
      if (err instanceof Error) {
        logger.error(err);
      }
      delete pending[index];
      cache[id.toString()] = mod;
      continueParsing();
    });
  }
  
  for (const id of added) {
    if (pending.includes(id)) continue;
    let index = pending.push(id) - 1;
    logger.debug(chalk`Fetching project {yellow ${id}}`);
    cf.getMod(id, (err, mod) => {
      logger.debug(chalk`Fetched project {yellow ${id}}`);
      if (err instanceof Error) {
        logger.error(err);
      }
      delete pending[index];
      cache[id.toString()] = mod;
      continueParsing();
    });
  }
  
  for (const { id } of modified) {
    if (pending.includes(id)) continue;
    let index = pending.push(id) - 1;
    logger.debug(chalk`Fetching project {yellow ${id}}`);
    cf.getMod(id, (err, mod) => {
      logger.debug(chalk`Fetched project {yellow ${id}}`);
      if (err instanceof Error) {
        logger.error(err);
      }
      delete pending[index];
      cache[id.toString()] = mod;
      continueParsing();
    });
  }
  
  async function continueParsing() {
    if (!pending.every(value => typeof value === 'undefined')) return;
    logger.debug('No more pending requests, continuing');
    const changelog = [];
    let changelogString = '\n';
    if (file1.minecraft.modLoaders[0].id !== file2.minecraft.modLoaders[0].id) {
      changelog.push(['Updated', chalk`{underline Minecraft Forge}`, chalk`{blue ${cleanVersion('forge', file1.minecraft.modLoaders[0].id)}}`, '->', chalk`{blue ${cleanVersion('forge', file2.minecraft.modLoaders[0].id)}}`]);
    }
    
    for (const id of added) {
      const mod = cache[id.toString()];
      if (typeof mod === 'undefined') {
        logger.error(chalk`{bgRed Unexpected Error} Project {yellow ${id}} wasn't stored properly for some reason, please try running this script again.`);
        process.exit(5);
      }
      changelog.push(['Added', chalk`{underline ${mod.name}}`]);
    }
    
    for (const id of removed) {
      const mod = cache[id.toString()];
      if (!mod) {
        logger.error(chalk`{bgRed Unexpected Error} Project {yellow ${id}} wasn't stored properly for some reason, please try running this script again.`);
        process.exit(5);
      }
      changelog.push(['Removed', chalk`{underline ${mod.name}}`]);
    }
    
    for (const { id, from, to } of modified) {
      const mod = cache[id.toString()];
      if (typeof mod === 'undefined') {
        logger.error(chalk`{bgRed Unexpected Error} Project {yellow ${id}} wasn't stored properly for some reason, please try running this script again.`);
        process.exit(5);
      }
      logger.debug(chalk`Fetching files for {yellow ${mod.name}}`);
      const modfiles = await cf.getModFiles(id);
      logger.debug(chalk`Fetched files for {yellow ${mod.name}}`);
      const filefrom = modfiles.find(v => v.id === from);
      const fileto = modfiles.find(v => v.id === to);
      let errorfilefind = false;
      if (typeof filefrom === 'undefined') {
        errorfilefind = true;
        logger.error(chalk`{bgRed ERROR} No file with id {yellow ${from}} found for ${mod.name}`);
      }
      if (typeof fileto === 'undefined') {
        errorfilefind = true;
        logger.error(chalk`{bgRed ERROR} No file with id {yellow ${to}} found for ${mod.name}`);
      }
      if (errorfilefind) continue;
      changelog.push(['Updated', chalk`{underline ${mod.name}}`, chalk`{blue ${filefrom ? cleanVersion(mod.name, filefrom.displayName) : 'unknown'}}`, '->', chalk`{blue ${fileto ? cleanVersion(mod.name, fileto.displayName) : 'unknown'}}`]);
    }
    const widthcounts = [];
    changelog.sort((a, b) => {
      // Forge is always on top
      if (a[1] === chalk`{underline Minecraft Forge}`) return -1;
      if (b[1] === chalk`{underline Minecraft Forge}`) return 1;
      // Sort in alphabetical order
      let value = a[0].localeCompare(b[0]);
      if (value === 0) {
        return a[1].localeCompare(b[1]);
      } else {
        return value;
      }
    });
    changelog.forEach(line => {
      line.forEach((value, index) => {
        if (typeof widthcounts[index] === 'undefined' ||
        value.length > widthcounts[index]) widthcounts[index] = value.length;
      });
    });
    changelog.forEach(line => {
      line.forEach((value, index) => {
        changelogString += ' ' + value + repeatString(' ', widthcounts[index] - value.length);
      });
      changelogString += '\n';
    });
    logger.quiet(changelogString);
    
    process.exit(0);
  }
  
  function repeatString(string, times) {
    let repeatedstring = '';
    for (let i = 0; i < times; i++) {
      repeatedstring += string;
    }
    return repeatedstring;
  }
  
  function cleanVersion(name, version) {
    const origversion = version;
    name = name.toLowerCase();
    version = version.toLowerCase();
    version = version.replace(/(\.|\-|\_|\s)+(forge|fabric)?(\.jar)?$/i, '');
    const possibleNames = [
      name,
      name.replace(/\s/gi, '_'),
      name.replace(/\s/gi, '-'),
      name.replace(/\s/gi, '.'),
      name.replace(/\s/gi, '')
    ];
    // Remove actual name from version
    for (const possibleName of possibleNames) {
      if (version.includes(possibleName)) version = version.replace(possibleName, '');
    }
    version = version.trim().replace(/^(\.|\-|\_|\s|v)+/, '');
    logger.debug(chalk`Renamed {blue ${origversion}} to {blue ${version}}`);
    return version; ``
  }
  
  function verifyManifestFiles(file, filename) {
    let pass = true;
    if (typeof file.manifestType === 'undefined') {
      logger.debug(chalk`{yellow ${filename}}: Property {green manifestType} doesn't exist`);
      pass = false;
    } else if (typeof file.manifestType !== 'string') {
      logger.debug(chalk`{yellow ${filename}}: Property {green manifestType} is not a string`);
      pass = false
    } else if (file.manifestType !== 'minecraftModpack') {
      logger.debug(chalk`{yellow ${filename}}: Property {green manifestType} is not 'minecraftModpack'`);
      return false;
    }
    if (typeof file.minecraft === 'undefined') {
      logger.debug(chalk`{yellow ${filename}}: Property {green minecraft} doesn't exist`);
      pass = false;
    } else if (typeof file.minecraft !== 'object') {
      logger.debug(chalk`{yellow ${filename}}: Property {green minecraft} is not an object`);
      pass = false;
    } else {
      if (typeof file.minecraft.version === 'undefined') {
        logger.debug(chalk`{yellow ${filename}}: Property {green minecraft.version} doesn't exist`);
        pass = false;
      } else if (typeof file.minecraft.version !== 'string') {
        logger.debug(chalk`{yellow ${filename}}: Property {green minecraft.version} is not a string`);
        pass = false;
      }
      if (typeof file.minecraft.modLoaders === 'undefined') {
        logger.debug(chalk`{yellow ${filename}}: Property {green minecraft.modLoaders} doesn't exist`);
        pass = false;
      } else if (!(file.minecraft.modLoaders instanceof Array)) {
        logger.debug(chalk`{yellow ${filename}}: Property {green minecraft.modLoaders} is not an array`);
        pass = false;
      } else {
        file.minecraft.modLoaders.forEach((modLoader, index) => {
          if (typeof modLoader.id === 'undefined') {
            logger.debug(chalk`{yellow ${filename}}: Property {green minecraft.modloaders[}{yellow ${index}}{green ].id} doesn't exist`);
            pass = false;
          } else if (typeof modLoader.id !== 'string') {
            logger.debug(chalk`{yellow ${filename}}: Property {green minecraft.modLoaders[}{yellow ${index}}{green ].id} is not a string`);
            pass = false;
          }
          if (typeof modLoader.primary === 'undefined') {
            logger.debug(chalk`{yellow ${filename}}: Property {green minecraft.modLoaders[}{yellow ${index}}{green ].primary} doesn't exist`);
            pass = false;
          } else if (typeof modLoader.primary !== 'boolean') {
            logger.debug(chalk`{yellow ${filename}}: Property {green minecraft.modLoaders[}{yellow ${index}}{green ].primary} is not a boolean`);
            pass = false;
          }
        });
      }
    }
    if (typeof file.name === 'undefined') {
      logger.debug(chalk`{yellow ${filename}}: Property {green name} doesn't exist`);
      pass = false;
    } else if (typeof file.name !== 'string') {
      logger.debug(chalk`{yellow ${filename}}: Property {green name} is not a string`);
      pass = false;
    }
    if (typeof file.version === 'undefined') {
      logger.debug(chalk`{yellow ${filename}}: Property {green version} doesn't exist`);
      pass = false;
    } else if (typeof file.version !== 'string') {
      logger.debug(chalk`{yellow ${filename}}: Property {green version} is not a string`);
      pass = false;
    }
    if (typeof file.author === 'undefined') {
      logger.debug(chalk`{yellow ${filename}}: Property {green author} doesn't exist`);
      pass = false;
    } else if (typeof file.author !== 'string') {
      logger.debug(chalk`{yellow ${filename}}: Property {green author} is not a string`);
      pass = false;
    }
    if (typeof file.manifestVersion === 'undefined') {
      logger.debug(chalk`{yellow ${filename}}: Property {green manifestVersion} doesn't exist`);
      pass = false;
    } else if (typeof file.manifestVersion !== 'number') {
      logger.debug(chalk`{yellow ${filename}}: Property {green manifestVersion} is not a number`);
      pass = false;
    }
    if (typeof file.files === 'undefined') {
      logger.debug(chalk`{yellow ${filename}}: Property {green files} doesn't exist`);
      pass = false;
    } else if (!(file.files instanceof Array)) {
      logger.debug(chalk`{yellow ${filename}}: Property {green files} is not an array`);
      pass = false;
    } else {
      file.files.forEach((project, index) => {
        if (typeof project.projectID === 'undefined') {
          logger.debug(chalk`{yellow ${filename}}: Property {green minecraft.files[}{yellow ${index}}{green ].projectID} doesn't exist`);
          pass = false;
        } else if (typeof project.projectID !== 'number') {
          logger.debug(chalk`{yellow ${filename}}: Property {green minecraft.files[}{yellow ${index}}{green ].projectID} is not a number`);
          pass = false;
        }
        if (typeof project.fileID === 'undefined') {
          logger.debug(chalk`{yellow ${filename}}: Property {green minecraft.files[}{yellow ${index}}{green ].fileID} doesn't exist`);
          pass = false;
        } else if (typeof project.fileID !== 'number') {
          logger.debug(chalk`{yellow ${filename}}: Property {green minecraft.files[}{yellow ${index}}{green ].fileID} is not a number`);
          pass = false;
        }
        if (typeof project.required === 'undefined') {
          logger.debug(chalk`{yellow ${filename}}: Property {green minecraft.files[}{yellow ${index}}{green ].required} doesn't exist`);
          pass = false;
        } else if (typeof project.required !== 'boolean') {
          logger.debug(chalk`{yellow ${filename}}: Property {green minecraft.files[}{yellow ${index}}{green ].required} is not a boolean`);
          pass = false;
        }
        
      });
    }
    return pass;
  }
}

function stripSpaces(string) {
  let spacecount = Number.MAX_SAFE_INTEGER;
  for (const line of string.split('\n')) {
    // Don't count empty lines
    if (/^[\n\r\s]*$/gi.test(line)) continue;
    let counter = 0;
    charCounter: for (const char of line.split('')) {
      if (/\s/.test(char))
      counter++;
      else
      break charCounter;
    }
    if (spacecount > counter) spacecount = counter;
  }
  let lines = string.split('\n').map((value) => {
    // Don't count empty lines
    if (/^[\n\r\s]*$/gi.test(value)) return value;
    return value.substring(spacecount, value.length);
  });
  return lines.join('\n');
}

function parseArguments(args, manifest) {
  argscheck: for (let index = 0; index < args.length; index++) {
    const value = args[index];
    manifestname: for (const name in manifest) {
      if (Object.hasOwnProperty.call(manifest, name)) {
        const arg = manifest[name];
        if (arg.alias.includes(value)) {
          if (arg.type !== 'flag') {
            let i = 0;
            checkArgArgs: while (true) {
              if (i + index < arg.args.length - 1 + index) {
                if (typeof args[i + index] === 'undefined') {
                  logger.error(new Error('Not enough arguments for argument' + value));
                  process.exit(3);
                }
                i++;
                continue checkArgArgs;
              } else {
                index += i;
                break checkArgArgs;
              }
            }
          }
          continue argscheck;
        } else {
          continue manifestname;
        }
      }
    }
  }
  let parsed = {};
  let subcommandDetect = false;
  for (const name in manifest) {
    if (Object.hasOwnProperty.call(manifest, name)) {
      const arg = manifest[name];
      if (arg.type === 'flag') {
        parsed[name] = hasFlag(...arg.alias);
      }
      if (arg.type === 'argument') {
        parsed[name] = getArguments(arg.args.length, ...arg.alias);
      }
      if (arg.type === 'subcommand') {
        if (args.filter(value => arg.alias.includes(value)).length > 1 && subcommandDetect) {
          logger.error(RangeError(`Too many subcommands provided`));
          process.exit(3);
        }
        subcommandDetect = true;
        const argvalues = getArguments(arg.args.length, ...arg.alias);
        parsed[name] = [];
        arg.args.forEach((value, index) => {
          parsed[name][index] = argvalues[index];
        });
      }
    }
  }
  return parsed;
  function getArguments(limit, ...identifiers) {
    let values = [];
    for (const identifier of identifiers) {
      if (values.length > limit && limit !== -1) break;
      args.forEach((value, index, argv) => {
        if (argv[index - 1] === identifier) {
          for (let i = 0; i < limit; i++) {
            values.push(argv[index + i]);
          }
          return;
        }
      });
    }
    return values;
  }
  
  function hasFlag(...identifiers) {
    return args.some(value => identifiers.includes(value));
  }
}

function stripANSI(string) {
  return string.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '');
}