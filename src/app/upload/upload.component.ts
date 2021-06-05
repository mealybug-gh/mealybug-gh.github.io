import { Component, OnInit } from '@angular/core';
import { EncryptionService } from '../encryption.service';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-upload',
  templateUrl: './upload.component.html',
  styleUrls: ['./upload.component.css']
})
export class UploadComponent implements OnInit {
  showFileDropdown: boolean = false;
  contentType: string = 'text';
  contentTypeName: string = 'Text';
  contentText: string = '';
  //fileKey: string = '';
  //fullFileKey: string = '';
  encryptionPassword: string = '';
  fileName: string = '';
  serverFileName: string = '';
  encryptedContent: string = '';
  isDownload: boolean = false;
  dataURI: SafeResourceUrl = null;
  applicationOrigin: string = '';
  errorMessage: string = null;
  constructor(private encryptionService: EncryptionService, private sanitizer: DomSanitizer) { }

  ngOnInit() {}

  onFileDropdownSelect(contentType: string = 'text', contentTypeName: string = 'Text') {
    this.showFileDropdown = false;
    if (contentType === 'document' || contentType === 'html' || contentType === 'text') {
      this.contentType = contentType;
      this.contentTypeName = contentTypeName;
    } else {
      this.contentType = 'text';
      this.contentTypeName = 'Text';
    }
  }

  onEncrypt() {
    try {
      this.errorMessage = null;
      const randomPrefix: string = ('000'+Math.round(Math.random()*10000)).slice(-4);
      this.encryptionPassword = this.encryptionPassword && this.encryptionPassword.length > 12 ? this.encryptionPassword : this.encryptionService.generatePassword();
      this.fileName = this.fileName && this.fileName.length ? this.fileName : this.encryptionService.generateFileName();
      this.serverFileName = this.encryptionService.toServerFileName(this.fileName);
      this.encryptedContent = '{ "type": "' + this.contentType + '", "data": "' + this.encryptionService.encrypt(this.contentText, this.encryptionPassword) + '" }';
      this.dataURI = this.sanitizer.bypassSecurityTrustResourceUrl('data:text/plain;charset=utf-8,' +     encodeURIComponent(this.encryptedContent));
      this.applicationOrigin = window.location.origin;
      this.isDownload = true;
    } catch (e) {
      console.log(e);
      this.errorMessage = 'There was an error during encryption. Please make sure you are using a modern browser like Google Chrome, Firefox or Chromium.';
    }
  }
}
