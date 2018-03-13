import { DialogflowApp } from 'actions-on-google';
import { UserInterface } from '../models/user';

export class Location {
  private app: DialogflowApp;
  private userStorage: UserInterface;
  private permissions;

  constructor(app: DialogflowApp) {
    this.app = app;
    this.userStorage = this.app.userStorage as UserInterface;
    this.permissions = this.app.SupportedPermissions;
  }

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
}
