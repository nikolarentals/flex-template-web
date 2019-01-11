const inquirer = require('inquirer');
const fs = require('fs');
const readline = require('readline');
const chalk = require('chalk');

const mandatoryVariables = settings => {
  const clientIdDefault = settings
    ? { default: settings.REACT_APP_SHARETRIBE_SDK_CLIENT_ID }
    : undefined;
  const stirpeDefault = settings
    ? { default: settings.REACT_APP_STRIPE_PUBLISHABLE_KEY }
    : undefined;
  const mapBoxDefault = settings ? { default: settings.REACT_APP_MAPBOX_ACCESS_TOKEN } : undefined;
  const currencyDefault = settings ? settings.REACT_APP_SHARETRIBE_MARKETPLACE_CURRENCY : null;

  return [
    {
      type: 'input',
      name: 'REACT_APP_SHARETRIBE_SDK_CLIENT_ID',
      message: `What is your Flex client ID?
${chalk.dim(
        'Client ID is needed for connecting with Flex API. You can find your client ID from Flex Console.'
      )}
`,
      validate: function(value) {
        if (value.match(/^[a-z0-9]{8}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{12}$/i)) {
          return true;
        }
        return 'Please enter valid Flex Client ID. You can check it form Flex Console!';
      },
      ...clientIdDefault,
    },
    {
      type: 'input',
      name: 'REACT_APP_STRIPE_PUBLISHABLE_KEY',
      message: `What is your Stripe publishable key?
${chalk.dim(
        `Stripe publishable API key is for generating tokens with Stripe API. Use test key (prefix pk_test_) for development. The secret key needs to be added to Flex Console. 
If you don't set the Stripe key, payment's won't work in the application.`
      )}
`,
      validate: function(value) {
        if (value.match(/^pk_/)) {
          return true;
        }
        return 'Please enter Stripe publishable key with prefix pk_!';
      },
      ...stirpeDefault,
    },
    {
      type: 'input',
      name: 'REACT_APP_MAPBOX_ACCESS_TOKEN',
      message: `What is your Mapbox access token?
${chalk.dim(
        `Mapbox is the default map provider of the application. Sign up for Mapbox and go the to account page. Then click Create access token. For more information see the: Integrating to map providers documentation.
If you don't set the Mapbox key, the map components won't work in the application.`
      )}
`,
      ...mapBoxDefault,
    },
    {
      type: 'input',
      name: 'REACT_APP_SHARETRIBE_MARKETPLACE_CURRENCY',
      message: `What is your marketplace currency?
${chalk.dim(
        'The currency used in the Marketplace must be in ISO 4217 currency code. For example USD, EUR, CAD, AUD, etc. The default value is USD.'
      )} 
`,
      default: function() {
        return currencyDefault ? currencyDefault : 'USD';
      },
      validate: function(value) {
        if (value.match(/^[a-zA-Z]{3}$/)) {
          return true;
        }
        return 'Please enter currency in ISO 4217 format (e.g. USD, EUR, CAD...)';
      },
    },
  ];
};

const advancedSettings = settings => {
  const rootUrlDefault = settings ? settings.REACT_APP_AVAILABILITY_ENABLED : null;
  const availabilityDefault = settings ? settings.REACT_APP_AVAILABILITY_ENABLED : null;
  const searchesDefault = settings ? settings.REACT_APP_AVAILABILITY_ENABLED : null;

  return [
    {
      type: 'confirm',
      name: 'showAdvancedSettings',
      message: 'Do you want to edit advanced settings?',
      default: false,
    },
    {
      type: 'input',
      name: 'REACT_APP_CANONICAL_ROOT_URL',
      message: `What is your canonical root URL? 
${chalk.dim(
        'Canonical root URL of the marketplace is needed for social media sharing and SEO optimization. When developing the template application locally URL is usually http://localhost:3000'
      )}
`,
      default: function() {
        return rootUrlDefault ? rootUrlDefault : 'http://localhost:3000';
      },
      when: function(answers) {
        return answers.showAdvancedSettings;
      },
    },
    {
      type: 'confirm',
      name: 'REACT_APP_AVAILABILITY_ENABLED',
      message: `Do you want to enable availability calendar?
${chalk.dim(
        'This setting enables the Availability Calendar for listings. The default value for this setting is true.'
      )}
`,
      default: availabilityDefault ? availabilityDefault : true,
      when: function(answers) {
        return answers.showAdvancedSettings;
      },
    },
    {
      type: 'confirm',
      name: 'REACT_APP_DEFAULT_SEARCHES_ENABLED',
      message: `Do you want to enable default search suggestions?
${chalk.dim(
        'This setting enables the Default Search Suggestions in location autocomplete search input. The default value for this setting is true.'
      )}
`,
      default: searchesDefault ? searchesDefault : true,
      when: function(answers) {
        return answers.showAdvancedSettings;
      },
    },
  ];
};

const updateEnvFile = data => {
  let content = '';
  data.map(line => {
    content = content + line.toString();
  });

  fs.writeFileSync('./.env', content);
};

const checkIfSameLine = (answers, line) => {
  let foundKey;
  if (answers) {
    Object.keys(answers).map(key => {
      if (line.includes(key)) {
        foundKey = key;
      }
    });
  }
  return foundKey;
};

const getData = values => {
  const { lines, answers } = values;

  const data = [];
  lines.map(line => {
    const key = checkIfSameLine(answers, line);
    if (key) {
      data.push(`${key}=${answers[key]}\n`);
    } else {
      data.push(`${line}\n`);
    }
  });

  return data;
};

// Read all lines from existing .env file to array. If line matches one of the keys in user's answers update add value to that line. Otherwise keep the original line.
const readLines = answers => {
  return new Promise((resolve, reject) => {
    const rl = readline.createInterface({
      input: require('fs').createReadStream('./.env'),
    });

    const lines = [];
    rl.on('line', function(line) {
      lines.push(line);
    });

    rl.on('close', () => {
      const values = { answers, lines };
      resolve(values);
    });
  });
};

// Create new .env file using .env-template
const createEnvFile = () => {
  fs.copyFileSync('./.env-template', './.env', err => {
    if (err) throw err;
  });
};

const findSavedValues = () => {
  const savedEnvFile = fs.readFileSync('./.env').toString();

  const settings = savedEnvFile.split('\n').reduce((obj, line) => {
    const splits = line.split('=');
    const key = splits[0];
    if (splits.length > 1) {
      obj[key] = splits.slice(1).join('=');
    }
    return obj;
  }, {});

  return settings;
};

const askQuestions = settings => {
  inquirer
    .prompt(mandatoryVariables(settings))
    .then(answers => {
      return readLines(answers);
    })
    .then(values => {
      const data = getData(values);
      updateEnvFile(data);

      console.log(chalk.yellow.bold(`Advanced settings:`));
      inquirer
        .prompt(advancedSettings(settings))
        .then(answers => {
          return readLines(answers);
        })
        .then(values => {
          const data = getData(values);
          updateEnvFile(data);
          console.log(`
${chalk.green.bold('Environment variables saved succesfully!')} 

Start the Flex template application by running ${chalk.bold.cyan('yarn run dev')}

Note that the .env file is a hidden file so it might not be visible directly in directory listing. If you want to update the environment variables run ${chalk.cyan.bold(
            'yarn run config'
          )} again or edit the .env file directly. Remember to restart the application after editing the environment variables! 
        `);
        });
    })
    .catch(err => {
      console.log(chalk.red(`An error occurred due to: ${err.message}`));
    });
};

const checkRequiredValues = () => {
  const settings = findSavedValues();
  const hasClientID = settings && settings.REACT_APP_SHARETRIBE_SDK_CLIENT_ID !== '';
  const hasStripeKey = settings && settings.REACT_APP_STRIPE_PUBLISHABLE_KEY !== '';
  const hasMapBoxKey = settings && settings.REACT_APP_MAPBOX_ACCESS_TOKEN !== '';
};
const run = () => {
  if (process.argv[2] && process.argv[2] === '--check') {
    if (!fs.existsSync(`./.env`)) {
      process.on('exit', code => {
        console.log(`

${chalk.bold.red(`You don't have required .env file!`)} 

Some environment variables are required before starting the app. You can create the .env file and configure the variables by running ${chalk.cyan.bold(
          'yarn run config'
        )}

  `);
      });

      process.exit(1);
    }
  } else if (fs.existsSync(`./.env`)) {
    console.log(`
${chalk.bold('.env file already exists!')} 
You can also edit the variables directly from the file. Remember to restart the application after editing the environment variables!
    `);

    inquirer
      .prompt([
        {
          type: 'confirm',
          name: 'editEnvFile',
          message: 'Do you want to edit the .env file?',
          default: false,
        },
      ])
      .then(answers => {
        if (answers.editEnvFile) {
          const settings = findSavedValues();

          console.log('Settings:', settings);

          askQuestions(settings);
        }
      });
  } else {
    createEnvFile();
    askQuestions();
  }
};

run();
