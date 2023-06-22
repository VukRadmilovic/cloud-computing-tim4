import { Injectable } from '@angular/core';
import {HttpEvent, HttpHandler, HttpInterceptor, HttpRequest} from "@angular/common/http";
import {Observable, timer} from "rxjs";
import {JwtHelperService} from "@auth0/angular-jwt";
import {NotificationsService} from "../services/notifications.service";
import {Router} from "@angular/router";

@Injectable({
  providedIn: 'root'
})
export class InterceptorService implements HttpInterceptor {

  constructor(private notificationService: NotificationsService,
              private router: Router) { }
  jwtHelper = new JwtHelperService();
  intercept(
    req: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {
    const accessToken: any = sessionStorage.getItem('user');
    if (req.headers.get('skip')) {
      return next.handle(req);
    }
    if (accessToken) {
      if (this.jwtHelper.isTokenExpired(accessToken)) {
        this.notificationService.createNotification("Session expired. You will be redirected to the login page.");
        timer(5000).subscribe(x => { this.router.navigate(['']) })
      }
      const cloned = req.clone({
        setHeaders: {
          Authorization: accessToken
        }
      });
      return next.handle(cloned);
    } else {
      return next.handle(req);
    }
  }
}
