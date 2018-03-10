'use strict';

process.env.DEBUG = 'actions-on-google:*';

const App = require('actions-on-google').DialogflowApp;
const functions = require('firebase-functions');
const requestjs = require('request');

// a. the action name from the make_name Dialogflow intent
const NAME_ACTION = 'input.welcome';

// b. the parameters that are parsed from the make_name intent
// const COLOR_ARGUMENT = 'color';
// const NUMBER_ARGUMENT = 'number';

exports.getBusSchedule = functions.https.onRequest((request, response) => {
    const app = new App({request, response});

    function getSchedule(app) {
        requestjs('https://wsmobile.rtcquebec.ca/api/v2/horaire/ListeBorneVirtuelle_Arret?source=appmobileios&arrets=2557', function (error, response, body) {
            if (error || (response && response.statusCode !== 200)) {
                sorry();
                return;
            }

            const schedules = JSON.parse(body);
            const busline = schedules.find((line) => line.parcours.noParcours === '800');

            if (!busline) {
                sorry();
                return;
            }

            const times = busline.horaires.map((schedule) => schedule.departMinutes).sort((a, b) => a - b).join(', ');
            const name = `${busline.parcours.noParcours} direction ${busline.parcours.descriptionDirection}`;

            app.tell(`Le bus ${name} passe dans ${times} minutes.`);
        });
    }

    function sorry() {
        app.tell("Désolé, je n'ai pas pu trouver les horaires pour ce bus.");
    }

    let actionMap = new Map();
    actionMap.set(NAME_ACTION, getSchedule);

    app.handleRequest(actionMap);
});
