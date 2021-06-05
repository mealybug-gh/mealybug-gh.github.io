import { Component, OnDestroy, OnInit, Pipe, PipeTransform, SecurityContext } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { EncryptionService } from '../encryption.service';
import { HttpClient } from '@angular/common/http';
import { DomSanitizer, SafeHtml, SafeScript } from '@angular/platform-browser';

@Pipe({ name: 'safeHtml'})
export class SafeHtmlPipe implements PipeTransform  {
  constructor(private sanitized: DomSanitizer) {}
  transform(value: string): SafeHtml{
    return this.sanitized.bypassSecurityTrustHtml(value);
  }
}

@Component({
  selector: 'app-viewer',
  templateUrl: './viewer.component.html',
  styleUrls: ['./viewer.component.css']
})
export class ViewerComponent implements OnInit, OnDestroy {

  fileName: string = '';
  serverFileName: string = '';
  password: string = '';
  decryptedText: string = '';
  fileType: string = '';
  documentHTML: string = null;
  errorMessage: string = null;
  isLoading: boolean = true;
  siteUrl: string = '';
  showFirst: string = '';
  constructor(private http: HttpClient, private route: ActivatedRoute, private router: Router, private sanitizer: DomSanitizer, private encryptionService: EncryptionService) {
    this.router.routeReuseStrategy.shouldReuseRoute = () => false;
  }

  ngOnDestroy() {}
  ngOnInit() {
    this.siteUrl = window.location.origin + '/';
    this.errorMessage = null;
    this.route.paramMap.subscribe(params => {
      const paramfileName: string = params.get('fileName') && params.get('fileName').length ? params.get('fileName').trim() : '';
      const parampassword: string = params.get('password') && params.get('password').length ? params.get('password').trim() : '';
      const paramshowFirst: string = params.get('showFirst') && params.get('showFirst').length ? '.showDocument #'+params.get('showFirst').trim() : '.showDocument h1';

      if (paramfileName === this.fileName && parampassword === this.password && this.decryptedText && this.decryptedText.length > 0) {
        this.showFirst = paramshowFirst;
        window['showNewAnchor'](this.showFirst);
        return;
      }

      this.fileName = paramfileName;
      this.password = parampassword;
      this.showFirst = paramshowFirst;

      if (!this.fileName || this.fileName.length <= 0 || !this.password || this.password.length <= 0) {
        this.errorMessage = 'Sorry, something went wrong here! Possible reason: broken link.';
      } else {
        this.http.get(this.siteUrl+'uploads/'+this.encryptionService.toServerFileName(this.fileName)+'.json?nocache='+(new Date().getTime())).subscribe((answer: any) => {
          if (answer && answer.type && answer.data) {
            try {
              this.decryptedText = this.encryptionService.decrypt(answer.data, this.password);
              if (answer.type === 'html' || answer.type === 'document') {
                this.documentHTML = this.decryptedText;
              }
              this.isLoading = false;
              this.fileType = answer.type;
              const showFirst: string = this.showFirst;
              setTimeout(function(){
                if (typeof window['addDocumentTOC'] === 'function') {
                  window['addDocumentTOC'](showFirst);
                }
              }, 100);
            } catch (e) {
              this.isLoading = false;
              this.errorMessage = 'Sorry, something went wrong here! Possible reason: broken link.';
            }
          } else {
            this.isLoading = false;
            this.errorMessage = 'Sorry, something went wrong here! Possible reason: broken link or missing file.';
          }
        }, (error: any) => {
          this.isLoading = false;
          this.errorMessage = 'Sorry, something went wrong here! Possible reason: broken link or missing file.';
        });
      }
    });
  }
}
