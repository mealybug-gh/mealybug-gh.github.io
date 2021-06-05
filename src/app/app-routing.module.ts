import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { StartComponent } from './start/start.component';
import { ViewerComponent } from './viewer/viewer.component';
import { UploadComponent } from './upload/upload.component';
import { HttpClientModule } from '@angular/common/http';
import { HashLocationStrategy, LocationStrategy } from '@angular/common';

const routes: Routes = [
  {path: 'view/:fileName/:password', component: ViewerComponent},
  {path: 'view/:fileName/:password/:showFirst', component: ViewerComponent},
  {path: 'upload', component: UploadComponent},
  {path: '', component: StartComponent}
];

@NgModule({
  imports: [RouterModule.forRoot(routes), HttpClientModule ],
  exports: [RouterModule],
  providers: [{provide: LocationStrategy, useClass: HashLocationStrategy}]
})
export class AppRoutingModule { }
