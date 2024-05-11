export type Session = {
  /** Describe unique session id */
  sid?: string;
  [props: string]: undefined | string | boolean | number;
};
