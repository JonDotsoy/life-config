export type Session = {
  /** Describe unique session id. If is not defined is auto generated */
  sid?: string;
  [props: string]: undefined | string | boolean | number;
};
