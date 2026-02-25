import { Component } from '@angular/core';

@Component(
  { selector: 'app-layout',
    templateUrl: './layout.component.html',
    styleUrls: ['./layout.component.css']
}
)
export class LayoutComponent {
  constructor() {}
}

// Added by code generation
import { Router } from '@angular/router';

export class LayoutComponent {

get Links(): string[] {
  return ["Dashboard", "Test"];
}