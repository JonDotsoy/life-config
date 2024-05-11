export type OnceFn = () => void;

export const onceFn = (cb: () => void): OnceFn => {
  const fn = () => {
    if (fn.ready === false) cb();
  };
  fn.ready = false;
  return fn;
};
