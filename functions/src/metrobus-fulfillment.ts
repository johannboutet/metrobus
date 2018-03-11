import { DialogflowApp } from 'actions-on-google';
import { Request, Response } from 'express';
import { BusLineStopTime } from 'models/rtc_responses';
import { UserInterface } from 'models/user';
import * as request from 'request';

export class MetrobusFulfillment {
  private app: DialogflowApp;
  private permissions;
  private userStorage: UserInterface;

  private metrobusActions = {
    WELCOME_ACTION: 'input.welcome',
    GET_STOP_TIMES_ACTION: 'get_stop_times',
  };

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

    actionMap.set(this.metrobusActions.WELCOME_ACTION, this.requestLocation);
    actionMap.set(this.metrobusActions.GET_STOP_TIMES_ACTION, this.getStopTimes);

    this.app.handleRequest(actionMap);
  }

  requestLocation = () => {
    this.app.askForPermission('Pour trouver les arrêts de bus proches de vous', this.permissions.DEVICE_PRECISE_LOCATION);
  };

  getStopTimes = () => {
    if (this.app.isPermissionGranted()) {
      const deviceCoordinates = this.app.getDeviceLocation().coordinates;
      console.log('location', deviceCoordinates);

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
      this.app.tell('Désolé, je n\'ai pas pu vous localiser.');
    }
  };

  sorry = () => {
    this.app.tell('Désolé, je n\'ai pas pu trouver les horaires pour ce bus.');
  };
}
