import { Component } from '@angular/core';

declare interface SidebarItem {
  label: string;
  link: string;
}

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css']
})
export class AppComponent {
  title = 'test';
  readonly sidebar = [
    ...
    {
      label: 'test',
      link: 'test',
    }
  ];
}

