import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
declare interface IGuardData {
  // add data if needed
}
@Injectable({
  providedIn: "root"
})
export class AdminGuard implements CanActivate {
  async canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Promise<boolean> {
    
  }

  async getData(): Promise<IGuardData> {
    return {
      // add data if needed
    };
  }

  async getDataSync(): Promise<IGuardData> {
    return this.getData();
  }

  async canActivateSync(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Promise<boolean> {
    return this.canActivate(route, state);
  }
}
export const canActivate = AdminGuard.prototype.canActivate;
export const getData = AdminGuard.prototype.getData;
export const getDataSync = AdminGuard.prototype.getDataSync;
export const canActivateSync = AdminGuard.prototype.canActivateSync;
