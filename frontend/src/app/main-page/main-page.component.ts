import {Component, OnInit} from '@angular/core';
import {UserService} from "../services/user.service";
import {FilesService} from "../services/files.service";
import {FileBasicInfo} from "../model/FileBasicInfo";
import {FileTypeEnum} from "../model/enums/FileTypeEnum";
import {FormControl, FormGroup, Validators} from "@angular/forms";
import {Tag} from "../model/Tag";
import {NotificationsService} from "../services/notifications.service";
import {Router} from "@angular/router";

@Component({
  selector: 'app-main-page',
  templateUrl: './main-page.component.html',
  styleUrls: ['./main-page.component.css']
})
export class MainPageComponent implements OnInit{

  files! : FileBasicInfo[];
  tags : Tag[] = [];
  current_path : string =  "/";
  fileForMoveOrCopy: string = "";
  fileBeingCopied: boolean | undefined = undefined;
  uploadedFile!: File;
  uploadedFileForModification : File | null = null;
  selectedFileInfo! : any;
  enableUpload = false;
  thumbnails : string[] = [];
  showFileDetails = false;
  selectedFile! : FileBasicInfo;
  selectedFileThumbnail! : string;

  constructor(private userService : UserService,
              private notificationService: NotificationsService,
              private fileService: FilesService, private router: Router) {}

  tagForm = new FormGroup({
    tagName: new FormControl('',[Validators.required]),
    tagValue: new FormControl( '',[Validators.required]),
  })
  albumName: string = "";
  shareUser: string = "";
  enablePaste:boolean = false;

  public ngOnInit() {
    if(this.userService.getLoggedUsername() == ""){
      const token = window.location.href.split("#")[1].split("=")[1].split("&")[0];
      this.userService.login(token);
    }
    this.fileService.getUserFiles('0').subscribe( result => {
      let objects = JSON.parse(result.toString())
      this.files = objects;
      this.files.forEach((file) => {
        const tokens = file.file.split("/");
        file.file = tokens[tokens.length - 1];
        if(file.type == FileTypeEnum.APPLICATION || file.type == FileTypeEnum.TEXT || file.type == FileTypeEnum.DOC
        || file.type == FileTypeEnum.DOCX || file.type == FileTypeEnum.PPT || file.type == FileTypeEnum.PPTX) this.thumbnails.push("assets/images/text.png");
        else if(file.type == FileTypeEnum.AUDIO) this.thumbnails.push("assets/images/audio.png");
        else if(file.type == FileTypeEnum.VIDEO) this.thumbnails.push("assets/images/video.png");
        else if(file.type == FileTypeEnum.FOLDER) {
          file.file = tokens[tokens.length - 2];
          this.thumbnails.push("assets/images/folder.png");
        }
        else this.thumbnails.push(file.url);
      })
    });
  }

  public onFileSelected(event : any, isChange : boolean) : void {
    const files = event.target.files;
    if(!isChange) {
      if (files.length == 0) this.enableUpload = false;
      else this.enableUpload = true;
      this.uploadedFile = files[0];
    }
    else {
      this.uploadedFileForModification = files[0];
    }
  }

  public addTag(isChange: boolean) : void {
    if(this.tagForm.valid) {
        const tag : Tag = {
          name : <string>this.tagForm.controls['tagName'].value,
          value : <string>this.tagForm.controls['tagValue'].value
        }
        const isAdded = this.checkIfTagIsAdded(tag.name);
        if(isAdded && !isChange) {
          this.notificationService.createNotification("Tag with that name already created!")
          return;
        }
        if(isAdded && isChange) {
          this.tags.forEach((tagIter) => {
            if(tagIter.name == tag.name) {
              tagIter.value = tag.value;
              return;
            }
          });
        }
        else {
          this.tags.push(tag);
        }
    }
  }

  public removeTag(tag : Tag) : void {
    let index = -1;
    for(const t of this.tags) {
      if (t.name == tag.name) {
        index = this.tags.indexOf(t);
        break;
      }
    }
    if (index >= 0) {
      this.tags.splice(index, 1);
    }
  }

  public checkIfTagIsAdded(name : string) : boolean {
    for(const tag of this.tags) {
      if(tag.name == name) return true;
    }
    return false;
  }

  public chipClicked(tag : Tag) : void {
    this.tagForm.controls['tagName'].setValue(tag.name);
    this.tagForm.controls['tagValue'].setValue(tag.value);
  }

  public showUploadStation() : void {
    this.showFileDetails = false;
  }

  public goBack() : void {
    if(this.current_path == "/") return;
    this.thumbnails = []
    const tokens = this.current_path.split('/')
    this.current_path = tokens.slice(0,tokens.length - 2).join('/') + '/'
    let path = ""
    if(this.current_path == "/") path = '0'
    else path = this.current_path.substring(1,this.current_path.length-1)
    this.fileService.getUserFiles(path).subscribe( result => {
      let objects = JSON.parse(result.toString())
      this.files = objects;
      this.files.forEach((file) => {
        const tokens = file.file.split("/");
        file.file = tokens[tokens.length - 1];
        if(file.type == FileTypeEnum.APPLICATION || file.type == FileTypeEnum.TEXT || file.type == FileTypeEnum.DOC
          || file.type == FileTypeEnum.DOCX || file.type == FileTypeEnum.PPT || file.type == FileTypeEnum.PPTX) this.thumbnails.push("assets/images/text.png");
        else if(file.type == FileTypeEnum.AUDIO) this.thumbnails.push("assets/images/audio.png");
        else if(file.type == FileTypeEnum.VIDEO) this.thumbnails.push("assets/images/video.png");
        else if(file.type == FileTypeEnum.FOLDER) {
          file.file = tokens[tokens.length - 2];
          this.thumbnails.push("assets/images/folder.png");
        }
        else this.thumbnails.push(file.url);
      })
    });
  }

  public viewDetails(file : FileBasicInfo, index: number) {
    if(file.type == FileTypeEnum.FOLDER) {
      this.files = []
      this.thumbnails = []
      this.current_path += file.file + "/";
      this.fileService.getUserFiles(this.current_path.substring(1,this.current_path.length-1)).subscribe( result => {
        let objects = JSON.parse(result.toString())
        this.files = objects;
        this.files.forEach((file) => {
          const tokens = file.file.split("/");
          file.file = tokens[tokens.length - 1];
          if(file.type == FileTypeEnum.APPLICATION || file.type == FileTypeEnum.TEXT || file.type == FileTypeEnum.DOC
            || file.type == FileTypeEnum.DOCX || file.type == FileTypeEnum.PPT || file.type == FileTypeEnum.PPTX) this.thumbnails.push("assets/images/text.png");
          else if(file.type == FileTypeEnum.AUDIO) this.thumbnails.push("assets/images/audio.png");
          else if(file.type == FileTypeEnum.VIDEO) this.thumbnails.push("assets/images/video.png");
          else if(file.type == FileTypeEnum.FOLDER) {
            file.file = tokens[tokens.length - 2];
            this.thumbnails.push("assets/images/folder.png");
          }
          else this.thumbnails.push(file.url);
        })
      });
    }
    else {
      this.showFileDetails = true;
      this.selectedFile = file;
      this.selectedFileThumbnail = this.thumbnails[index];
      this.tagForm.controls['tagValue'].setValue('');
      this.tagForm.controls['tagName'].setValue('');
      const file_path = this.userService.getLoggedUsername() + this.current_path + file.file;
      this.fileService.getFileData(file_path).subscribe({
        next: response => {
          console.log(response)
          const itemInfo = JSON.parse(response);
          this.selectedFileInfo = itemInfo;
          this.tags = [];
          const hiddenProperties = ["partial_path", "file_name", "creation_date", "last_modification_date", "size", "type", "valid"];
          for (let key in itemInfo) {
            if (Object.prototype.hasOwnProperty.call(itemInfo, key)) {
              if (hiddenProperties.indexOf(key) <= -1) {
                const tag: Tag = {
                  name: key,
                  value: itemInfo[key]
                }
                this.tags.push(tag)
              }
            }
          }
        },
        error: err => {
          console.log(err)
        }
      })
    }
  }

  public upload() : void {
    const now = new Date();
    const metadata = new Map();
    metadata.set("file_name",this.current_path.substring(1,this.current_path.length)  + this.uploadedFile.name);
    metadata.set("type",this.uploadedFile.type);
    metadata.set("size", this.uploadedFile.size);
    metadata.set("creation_date",now);
    metadata.set("last_modification_date",now);
    this.tags.forEach((tag) => {
      metadata.set(tag.name,tag.value);
    });
    this.fileService.requestUpload(Object.fromEntries(metadata.entries())).subscribe( {
      next : response => {
          if(response.hasOwnProperty('errorMessage')) {
            this.notificationService.createNotification(response.errorMessage);
            return;
          }
          const uploadInfo = JSON.parse(JSON.stringify(response));
          const formData = this.generateFormData(uploadInfo);
          this.fileService.uploadFile(uploadInfo["url"],formData).subscribe({
            next: () => {
              setTimeout(() => {
                window.location.reload();
              }, 2000);
            },
            error: err => {
              console.log(err);
            }
          })
      },
      error : error => {
        console.log(error);
        this.notificationService.createNotification(error.error.errorMessage);
      }
    })
  }

  public modify() : void {
    const now = new Date();
    const metadata = new Map();
    let hasUploadedFile = false;
    if(this.uploadedFileForModification != null) {
      metadata.set("file_name",this.uploadedFileForModification.name);
      metadata.set("type",this.uploadedFileForModification.type);
      metadata.set("size",this.uploadedFileForModification.size);
    }
    else {
      metadata.set("file_name", this.selectedFileInfo['file_name']);
      metadata.set("type", this.selectedFileInfo['type']);
      metadata.set("size", this.selectedFileInfo['size']);
    }
    metadata.set("creation_date",this.selectedFileInfo['creation_date']);
    metadata.set("last_modification_date",now);
    metadata.set("partial_path", this.selectedFileInfo["partial_path"]);

    this.tags.forEach((tag) => {
      metadata.set(tag.name,tag.value);
    });
    if(this.uploadedFileForModification == null) {
      this.fileService.modifyMetadataOnly(Object.fromEntries(metadata.entries())).subscribe( {
        next : response => {
          if(response.hasOwnProperty('errorMessage')) {
            console.log(response)
            this.notificationService.createNotification(response.errorMessage);
            return;
          }
          else {
            this.notificationService.createNotification(response);
            setTimeout(() => {
              window.location.reload();
            }, 2000);
          }
        },
        error : error => {
          console.log(error)
          this.notificationService.createNotification(error.error.errorMessage);
        }
      })
    }
    else {
      this.fileService.requestFullModification(Object.fromEntries(metadata.entries())).subscribe( {
        next : response => {
          if(response.hasOwnProperty('errorMessage')) {
            this.notificationService.createNotification(response.errorMessage);
            return;
          }
          const uploadInfo = JSON.parse(JSON.stringify(response));
          this.fileService.modifyFile(<File>this.uploadedFileForModification,uploadInfo).subscribe({
            next: () => {
              setTimeout(() => {
                window.location.reload();
              }, 2000);
            },
            error: err => {
              console.log(err);
              this.notificationService.createNotification(err.error.errorMessage);
            }
          })
        },
        error : error => {
          console.log(error)
          this.notificationService.createNotification(error.error.errorMessage)
        }
      })
    }
  }

  public delete() : void {
    this.fileService.deleteFile(this.selectedFileInfo['partial_path']).subscribe({
      next: response => {
        this.notificationService.createNotification(response);
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      }
    })
  }

  private generateFormData(uploadInfo: any) : FormData {
    const formData = new FormData();
    formData.append("key",uploadInfo["fields"]["key"]);
    formData.append("x-amz-algorithm",uploadInfo["fields"]["x-amz-algorithm"]);
    formData.append("x-amz-credential",uploadInfo["fields"]["x-amz-credential"]);
    formData.append("x-amz-date",uploadInfo["fields"]["x-amz-date"]);
    formData.append("x-amz-security-token",uploadInfo["fields"]["x-amz-security-token"]);
    formData.append("policy",uploadInfo["fields"]["policy"]);
    formData.append("x-amz-signature",uploadInfo["fields"]["x-amz-signature"]);
    formData.append("file",this.uploadedFile,this.uploadedFile.name);
    return formData;
  }

  download() {
    this.fileService.downloadFile(this.selectedFileInfo['partial_path']).subscribe({
      next: url => {
        window.open(url);
      },
      error: err => {
        console.log(err);
      }
    })
  }

  createAlbum() {
    this.fileService.createAlbum(this.current_path + this.albumName).subscribe({
      next: response => {
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      },
      error: err => {
        console.log(err);
      }
    })
  }

  deleteAlbum() {
    this.fileService.deleteAlbum(this.current_path).subscribe({
      next: response => {
        if (response != null && response.includes("Bad")) {
          this.notificationService.createNotification(response);
        } else {
          setTimeout(() => {
            window.location.reload();
          }, 1500);
        }
      },
      error: err => {
        console.log(err);
      }
    })
  }

  shareAlbum() {
    this.fileService.shareAlbum(this.current_path, this.shareUser).subscribe({
      next: response => {
        if (response != null && response.includes("Bad")) {
          this.notificationService.createNotification(response);
        } else {
          setTimeout(() => {
            window.location.reload();
          }, 1500);
        }
      },
      error: err => {
        console.log(err);
      }
    })
  }

  seeShared(){
    this.router.navigateByUrl('/shared')
  }

  familyAccount(){
    this.fileService.family(this.shareUser).subscribe({
      next: response => {
        if (response != null && response.includes("Bad")) {
          this.notificationService.createNotification(response);
        } else {
          setTimeout(() => {
            window.location.reload();
          }, 1500);
        }
      },
      error: err => {
        console.log(err);
      }
    })
  }

  stopShareAlbum() {
    this.fileService.stopShareAlbum(this.current_path, this.shareUser).subscribe({
      next: response => {
        if (response != null && response.includes("Bad")) {
          this.notificationService.createNotification(response);
        } else {
          setTimeout(() => {
            window.location.reload();
          }, 1500);
        }
      },
      error: err => {
        console.log(err);
      }
    })
  }

  copy() {
    if (this.selectedFileInfo == null) {
      return;
    }
    this.fileForMoveOrCopy = this.selectedFileInfo["partial_path"];
    this.fileBeingCopied = true;
    this.enablePaste = true;
  }

  move() {
    if (this.selectedFileInfo == null) {
      return;
    }
    this.fileForMoveOrCopy = this.selectedFileInfo["partial_path"];
    this.fileBeingCopied = false;
    this.enablePaste = true;
  }

  paste() {
    if (this.fileBeingCopied === true) {
      this.fileService.copyFile(this.fileForMoveOrCopy, this.current_path).subscribe({
        next: response => {
          if (response != null && response.includes("Bad")) {
            this.notificationService.createNotification(response);
          } else {
            setTimeout(() => {
              window.location.reload();
            }, 1500);
          }
        },
        error: err => {
          console.log(err);
        }
      })
    } else if (this.fileBeingCopied === false) {
      this.fileService.moveFile(this.fileForMoveOrCopy, this.current_path).subscribe({
        next: response => {
          if (response != null && response.includes("Bad")) {
            this.notificationService.createNotification(response);
          } else {
            setTimeout(() => {
              window.location.reload();
            }, 1500);
          }
        },
        error: err => {
          console.log(err);
        }
      })
    }
    this.fileForMoveOrCopy = "";
    this.fileBeingCopied = undefined;
    this.enablePaste = false;
  }
}
