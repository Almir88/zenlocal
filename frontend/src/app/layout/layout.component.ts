import { Component, Input, OnInit } from '@angular/core';
declare interface ITab {
  name: string;
  icon?: string;
  routerLink: string;
  disabled: boolean;
tabId: number; // this is for sorting

  active: boolean;

  onClick(): void;

  [disabled](): boolean;

  [active](): boolean;
}
declare class LayoutComponent implements OnInit {
  tabs: ITab[];
  selectedTab: ITab;
  variant = "standard";
  color = "primary";
elementRect: DOMRect;



  ngOnInit(): void {}

  selectTab(tab: ITab, i: number = -1): void {
    tab.active = true;
    if (i > -1) this.tabs[i].active = false;

    this.selectedTab = tab;
    if (this.elementRect && (this.variant === 'floating' || this.variant === 'scrolling' || this.variant === 'fixed')) {
      this.layoutService.scrollIntoView(this.elementRect);
    }
  }

  selectFirstTab(): void {}

  selectNextTab(): void {}

  selectPrevTab(): void {}

  // tslint:disable-next-line:no-output-on-blur
  onNavClick(event: MatTabChangeEvent): void {
  }

  setTheme(theme: any): void {}

  getTheme(): any {}

  getThemeClass(): string {}

  // tslint:disable-next-line:no-output-on-blur
  selectTab(event: any, i: number = -1): void {
    this.selectTab(event.tab, i);
  }
}
@Component({
  selector: 'app-layout',
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.css']
})
export class LayoutComponent {
  constructor() {}
}
