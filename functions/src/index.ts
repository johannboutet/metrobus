import * as functions from 'firebase-functions';
import * as actions from 'actions-on-google';
import * as request from 'request';

process.env.DEBUG = 'actions-on-google:*';

const App = actions.DialogflowApp;

// a. the action name from the make_name Dialogflow intent
const NAME_ACTION = 'input.welcome';

// b. the parameters that are parsed from the make_name intent
// const COLOR_ARGUMENT = 'color';
// const NUMBER_ARGUMENT = 'number';

export const getBusSchedule = functions.https.onRequest((req, resp) => {
  const app = new App({ request: req, response: resp });

  function getSchedule(app) {
    request('https://wsmobile.rtcquebec.ca/api/v2/horaire/ListeBorneVirtuelle_Arret?source=appmobileios&arrets=2557', function (error, response, body) {
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

      app.tell(`Salut ! Le bus ${name} passe dans ${times} minutes.`);
    });
  }

  function sorry() {
    app.tell('Désolé, je n\'ai pas pu trouver les horaires pour ce bus.');
  }

  const actionMap = new Map();
  actionMap.set(NAME_ACTION, getSchedule);

  app.handleRequest(actionMap);
});
