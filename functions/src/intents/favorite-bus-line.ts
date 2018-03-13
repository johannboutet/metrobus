import { DialogflowApp } from 'actions-on-google';
import * as request from 'request';
import { BusLine } from '../models/rtc_responses';
import { UserInterface } from '../models/user';

export class FavoriteBusLine {
  private app: DialogflowApp;
  private userStorage: UserInterface;

  constructor(app: DialogflowApp) {
    this.app = app;
    this.userStorage = this.app.userStorage as UserInterface;
  }

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

  askFavoriteBusLine = () => {
    if (!this.app.hasSurfaceCapability(this.app.SurfaceCapabilities.SCREEN_OUTPUT)) {
      this.app.tell('Désolé, je ne peux pas effectuer cette action sur un haut-parleur. Veuillez réessayer sur un appareil avec un écran.');
    }

    this.app.ask('Quelle est votre ligne de bus favorite ?');
  };

  setFavoriteBusLineNumber = () => {
    if (this.app.getArgument('bus_line_number')) {
      const lineNumber = `${this.app.getArgument('bus_line_number')}`;

      request.get(
        'https://wsmobile.rtcquebec.ca/api/v2/horaire/ListeParcours?source=appmobileios',
        (error, response, body) => {
          if (error || (response && response.statusCode !== 200)) {
            console.log('ERROR RTC', error);
            console.log('RESPONSE RTC', response);

            this.app.tell('Désolé, je n\'ai pas pu accéder à la liste des lignes de bus du RTC.');
          }

          const lines: BusLine[] = JSON.parse(body);
          const favoriteLine = lines.find(line => line.noParcours === lineNumber);

          if (favoriteLine) {
            this.userStorage.favoriteBusLine = {
              number: lineNumber,
              direction: null,
            };

            const dirText = [favoriteLine.descriptionDirectionPrincipale, favoriteLine.descriptionDirectionRetour].join(' et ');
            const dirContext = {
              bus_direction_aller: favoriteLine.descriptionDirectionPrincipale,
              bus_direction_retour: favoriteLine.descriptionDirectionRetour,
            };

            this.app.setContext('bus_line_directions', 5, dirContext);
            this.app.askWithList(
              `Les directions pour la ligne ${lineNumber} sont ${dirText}. Laquelle voulez-vous choisir ?`,
              this.app.buildList().addItems([
                this.app.buildOptionItem('bus_direction_aller').setTitle(favoriteLine.descriptionDirectionPrincipale),
                this.app.buildOptionItem('bus_direction_retour').setTitle(favoriteLine.descriptionDirectionRetour),
              ]),
            );
          }
          else {
            this.app.tell(`Désolé, je n'ai pas pu trouver de ligne bus pour le numéro ${lineNumber}.`);
          }
        },
      );
    }
  };

  setFavoriteBusLineDirection = () => {
    const choice = this.app.getSelectedOption();

    if (choice) {
      const direction = this.app.getContextArgument('bus_line_directions', choice) as { value: string };

      if (direction) {
        this.userStorage.favoriteBusLine.direction = `${direction.value}`;

        const line = this.userStorage.favoriteBusLine;

        this.app.tell(`Votre ligne favorite est maintenant le bus ${line.number} direction ${line.direction}.`);
      }
    }

    this.app.tell('Désolé, je n\'ai pas pu trouver cette direction.');
  };
}
