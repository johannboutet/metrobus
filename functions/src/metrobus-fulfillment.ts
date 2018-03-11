import { DialogflowApp } from 'actions-on-google';
import { Request, Response } from 'express';
import { BusLineStopTime } from 'models/rtc_responses';
import { UserInterface } from 'models/user';
import * as request from 'request';

const metrobusActions = {
  WELCOME: 'input.welcome',
  REQUEST_LOCATION: 'request_location',
  STORE_LOCATION: 'store_location',
  ASK_FAVORITE_BUS_LINE: 'ask_favorite_bus_line',
  STORE_FAVORITE_BUS_LINE: 'store_favorite_bus_line',
  GET_FAVORITE_BUS_LINE: 'get_favorite_bus_line',
  FAVORITE_BUS_LINE_FOLLOW_UP_NO: 'favorite_bus_line_follow_up_no',
  GET_STOP_TIMES: 'get_stop_times',
};

export class MetrobusFulfillment {
  private app: DialogflowApp;
  private userStorage: UserInterface;
  private permissions;

  constructor(req: Request, res: Response) {
    this.app = new DialogflowApp({
      request: req,
      response: res,
    });

    this.userStorage = this.app.userStorage as UserInterface;
    this.permissions = this.app.SupportedPermissions;
  }

  run() {
    const actionMap = new Map();

    actionMap.set(metrobusActions.WELCOME, this.welcome);

    actionMap.set(metrobusActions.REQUEST_LOCATION, this.requestLocation);
    actionMap.set(metrobusActions.STORE_LOCATION, this.storeLocation);

    actionMap.set(metrobusActions.ASK_FAVORITE_BUS_LINE, this.askFavoriteBusLine);
    actionMap.set(metrobusActions.STORE_FAVORITE_BUS_LINE, this.storeFavoriteBusLine);
    actionMap.set(metrobusActions.GET_FAVORITE_BUS_LINE, this.getFavoriteBusLine);
    actionMap.set(metrobusActions.FAVORITE_BUS_LINE_FOLLOW_UP_NO, this.favoriteBusLineFollowUpNo);

    actionMap.set(metrobusActions.GET_STOP_TIMES, this.getStopTimes);

    this.app.handleRequest(actionMap);
  }

  welcome = () => {
    if (this.userStorage.location && this.userStorage.favoriteBusLine) {
      this.getStopTimes();
    }
    else if (!this.userStorage.location && this.userStorage.favoriteBusLine) {
      this.requestLocation();
    }
    else if (this.userStorage && !this.userStorage.favoriteBusLine) {
      this.askFavoriteBusLine();
    }
    else if (!this.userStorage.location && !this.userStorage.favoriteBusLine) {
      // TODO
    }
  };

  askFavoriteBusLine = () => {
    this.app.ask('Quelle est votre ligne de bus favorite ?');
  };

  storeFavoriteBusLine = () => {
    const lineNumber = +this.app.getArgument('bus_line');
    const line = {
      number: lineNumber,
      direction: 'ouest',
    };

    this.userStorage.favoriteBusLine = line;

    this.app.tell(`Votre ligne favorite est maintenant le bus ${line.number} direction ${line.direction}.`);
  };

  getFavoriteBusLine = () => {
    const line = this.userStorage.favoriteBusLine;

    if (line) {
      this.app.ask(`Votre ligne favorite est le bus ${line.number} direction ${line.direction}. Voulez-vous la changer ?`);
    }
    else {
      this.app.ask('Je ne connais pas encore votre ligne de bus favorite. Voulez-vous la personnaliser maintenant ?');
    }
  };

  favoriteBusLineFollowUpNo = () => {
    const line = this.userStorage.favoriteBusLine;

    if (line) {
      this.app.tell(`D'accord, votre ligne favorite reste le bus ${line.number} direction ${line.direction}.`);
    }
    else {
      this.app.tell('D\'accord, demandez-moi plus tard si vous voulez la changer.');
    }
  };

  requestLocation = () => {
    this.app.askForPermission('Pour trouver les arrêts de bus proches de vous', this.permissions.DEVICE_PRECISE_LOCATION);
  };

  storeLocation = () => {
    if (this.app.isPermissionGranted()) {
      this.userStorage.location = this.app.getDeviceLocation().coordinates;

      this.app.tell('J\'ai bien enregistré votre position. Vous pouvez me redemander de vous localiser à tout moment pour mettre à jour votre position.');
    }
    else {
      this.app.tell('Je ne pourrai pas vous donner les horaires de passage aux arrêts de bus proches de chez vous si je n\'ai pas votre localisation.');
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
