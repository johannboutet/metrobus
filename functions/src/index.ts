import * as actions from 'actions-on-google';
import * as functions from 'firebase-functions';
import { BusLineStopTime } from 'models/rtc_responses';
import * as request from 'request';

process.env.DEBUG = 'actions-on-google:*';

const App = actions.DialogflowApp;

const metroBusActions = {
  WELCOME_ACTION: 'input.welcome',
  GET_STOP_TIMES_ACTION: 'get_stop_times',
};

export const metroBusFulfillment = functions.https.onRequest((req, resp) => {
  const app = new App({ request: req, response: resp });

  const requestLocation = (app) => {
    app.askForPermission('Pour trouver les arrêts de bus proches de vous', app.SupportedPermissions.DEVICE_PRECISE_LOCATION);
  };

  const getStopTimes = (app) => {
    if (app.isPermissionGranted()) {
      const deviceCoordinates = app.getDeviceLocation().coordinates;
      console.log('location', deviceCoordinates);

      request('https://wsmobile.rtcquebec.ca/api/v2/horaire/ListeBorneVirtuelle_Arret?source=appmobileios&arrets=2557', function (error, response, body) {
        if (error || (response && response.statusCode !== 200)) {
          sorry();
          return;
        }

        const schedules: BusLineStopTime[] = JSON.parse(body);
        const busLine = schedules.find((line) => line.parcours.noParcours === '800');

        if (!busLine) {
          sorry();
          return;
        }

        const times = busLine.horaires.map((schedule) => schedule.departMinutes).sort((a, b) => a - b).join(', ');
        const name = `${busLine.parcours.noParcours} direction ${busLine.parcours.descriptionDirection}`;

        app.tell(`Le bus ${name} passe dans ${times} minutes.`);
      });
    }
    else {
      app.tell('Désolé, je n\'ai pas pu vous localiser.');
    }
  };

  const sorry = () => {
    app.tell('Désolé, je n\'ai pas pu trouver les horaires pour ce bus.');
  };

  const actionMap = new Map();

  actionMap.set(metroBusActions.WELCOME_ACTION, requestLocation);
  actionMap.set(metroBusActions.GET_STOP_TIMES_ACTION, getStopTimes);

  app.handleRequest(actionMap);
});
