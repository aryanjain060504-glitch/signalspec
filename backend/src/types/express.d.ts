import { IUser } from '../modules/users/user.model';

declare global {
  namespace Express {
    // Augment Passport/Express User interface
    interface User extends IUser {}
  }
}
