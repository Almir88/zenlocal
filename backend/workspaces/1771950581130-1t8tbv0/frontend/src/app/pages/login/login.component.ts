import { Component } from '@angular/core';

@Component(
  {
    selector: 'app-login',
    template: 
      `\n      <div>\n        <p>Name Test: <input type='text' formControlName='name'/></p>\n        \n      </div>\n      `
  }
)
export class LoginComponent {
  constructor() { }\n}
