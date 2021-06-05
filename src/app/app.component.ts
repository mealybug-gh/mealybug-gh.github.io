import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  navbarShow: boolean = false;
  title: string = 'htmlbin';
  filePath: string = '';
}
