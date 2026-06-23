import { Model } from './model.js?v=2';
import { View } from './view.js?v=2';
import { Controller } from './controller.js?v=2';

document.addEventListener('DOMContentLoaded', () => {
  const model = new Model();
  const view = new View();
  const controller = new Controller(model, view);

  controller.init();
});
