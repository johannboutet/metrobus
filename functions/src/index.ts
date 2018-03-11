import * as functions from 'firebase-functions';
import { MetrobusFulfillment } from './metrobus-fulfillment';

process.env.DEBUG = 'actions-on-google:*';

export const metrobusFulfillment = functions.https.onRequest((req, res) => new MetrobusFulfillment(req, res).run());
