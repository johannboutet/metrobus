import { DialogflowApp } from 'actions-on-google';
import { Request, Response } from 'express';
import { BusLineStopTime } from 'models/rtc_responses';
import { UserInterface } from 'models/user';
import * as request from 'request';

const metrobusActions = {
  WELCOME: 'input.welcome',
  STORE_LOCATION: 'store_location',
  GET_STOP_TIMES: 'get_stop_times',
};

export class MetrobusFulfillment {
  private app: DialogflowApp;
  private permissions;
  private userStorage: UserInterface;

  constructor(req: Request, res: Response) {
    this.app = new DialogflowApp({
      request: req,
      response: res,
    });

    this.permissions = this.app.SupportedPermissions;
    this.userStorage = this.app.userStorage as UserInterface;
  }

  run() {
    const actionMap = new Map();

    actionMap.set(metrobusActions.WELCOME, this.requestLocation);
    actionMap.set(metrobusActions.STORE_LOCATION, this.storeLocation);
    actionMap.set(metrobusActions.GET_STOP_TIMES, this.getStopTimes);

    this.app.handleRequest(actionMap);
  }

  requestLocation = () => {
    this.app.askForPermission('Pour trouver les arrêts de bus proches de vous', this.permissions.DEVICE_PRECISE_LOCATION);
  };

  storeLocation = () => {
    if (this.app.isPermissionGranted()) {
      this.userStorage.location = this.app.getDeviceLocation().coordinates;

      this.app.tell('Merci, je peux maintenant vous donner les horaires de passage aux arrêts de bus proches de chez vous. Vous pouvez me redemander de vous localiser à tout moment pour mettre à jour votre position.')
    }
    else {
      this.app.tell('Je ne peux pas vous donner les horaires de passage aux arrêts de bus proches de chez vous si je n\'ai pas votre localisation.');
    }
  };

  getStopTimes = () => {
    if (this.userStorage.location) {
      request('https://wsmobile.rtcquebec.ca/api/v2/horaire/ListeBorneVirtuelle_Arret?source=appmobileios&arrets=2557', (error, response, body) => {
        if (error || (response && response.statusCode !== 200)) {
          this.sorry();
          return;
        }

        const schedules: BusLineStopTime[] = JSON.parse(body);
        const busLine = schedules.find((line) => line.parcours.noParcours === '800');

        if (!busLine) {
          this.sorry();
          return;
        }

        const times = busLine.horaires.map((schedule) => schedule.departMinutes).sort((a, b) => a - b).join(', ');
        const name = `${busLine.parcours.noParcours} direction ${busLine.parcours.descriptionDirection}`;

        this.app.tell(`Le bus ${name} passe dans ${times} minutes.`);
      });
    }
    else {
      this.app.tell('Il semblerait que je ne connaisse pas votre localisation. Demandez-moi de vous localiser pour m\'aider à trouver votre adresse.');
    }
  };

  sorry = () => {
    this.app.tell('Désolé, je n\'ai pas pu trouver les horaires pour ce bus.');
  };
}
