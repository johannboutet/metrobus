import { DialogflowApp } from 'actions-on-google';
import { Request, Response } from 'express'; // tslint:disable-line:no-implicit-dependencies
import * as request from 'request';
import { FavoriteBusLine } from './intents/favorite-bus-line';
import { Location } from './intents/location';
import { BusLineStopTime } from './models/rtc_responses';
import { UserInterface } from './models/user';

const metrobusActions = {
  WELCOME: 'input.welcome',
  REQUEST_LOCATION: 'request_location',
  STORE_LOCATION: 'store_location',
  GET_FAVORITE_BUS_LINE: 'get_favorite_bus_line',
  FAVORITE_BUS_LINE_FOLLOW_UP_NO: 'favorite_bus_line_follow_up_no',
  ASK_FAVORITE_BUS_LINE: 'ask_favorite_bus_line',
  SET_FAVORITE_BUS_LINE_NUMBER: 'set_favorite_bus_line_number',
  SET_FAVORITE_BUS_LINE_DIRECTION: 'set_favorite_bus_line_direction',
  GET_STOP_TIMES: 'get_stop_times',
};

export class MetrobusFulfillment {
  private app: DialogflowApp;
  private userStorage: UserInterface;

  constructor(req: Request, res: Response) {
    this.app = new DialogflowApp({
      request: req,
      response: res,
    });

    this.userStorage = this.app.userStorage as UserInterface;
  }

  run() {
    const actionMap = new Map();

    actionMap.set(metrobusActions.WELCOME, this.welcome);

    actionMap.set(metrobusActions.REQUEST_LOCATION, new Location(this.app).requestLocation);
    actionMap.set(metrobusActions.STORE_LOCATION, new Location(this.app).storeLocation);

    actionMap.set(metrobusActions.GET_FAVORITE_BUS_LINE, new FavoriteBusLine(this.app).getFavoriteBusLine);
    actionMap.set(metrobusActions.FAVORITE_BUS_LINE_FOLLOW_UP_NO, new FavoriteBusLine(this.app).favoriteBusLineFollowUpNo);
    actionMap.set(metrobusActions.ASK_FAVORITE_BUS_LINE, new FavoriteBusLine(this.app).askFavoriteBusLine);
    actionMap.set(metrobusActions.SET_FAVORITE_BUS_LINE_NUMBER, new FavoriteBusLine(this.app).setFavoriteBusLineNumber);
    actionMap.set(metrobusActions.SET_FAVORITE_BUS_LINE_DIRECTION, new FavoriteBusLine(this.app).setFavoriteBusLineDirection);

    actionMap.set(metrobusActions.GET_STOP_TIMES, this.getStopTimes);

    this.app.handleRequest(actionMap);
  }

  welcome = () => {
    if (this.userStorage.location && this.userStorage.favoriteBusLine) {
      this.getStopTimes();
    }
    else if (!this.userStorage.location && this.userStorage.favoriteBusLine) {
      new Location(this.app).requestLocation();
    }
    else if (this.userStorage && !this.userStorage.favoriteBusLine) {
      new FavoriteBusLine(this.app).askFavoriteBusLine();
    }
    else if (!this.userStorage.location && !this.userStorage.favoriteBusLine) {
      // TODO
    }
  };

  getStopTimes = () => {
    if (this.userStorage.location) {
      request('https://wsmobile.rtcquebec.ca/api/v2/horaire/ListeBorneVirtuelle_Arret?source=appmobileios&arrets=2557', (error, response, body) => {
        if (error || (response && response.statusCode !== 200)) {
          this.sorry();
        }

        const schedules: BusLineStopTime[] = JSON.parse(body);
        const busLine = schedules.find((line) => line.parcours.noParcours === '800');

        if (!busLine) {
          this.sorry();
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
