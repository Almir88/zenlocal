import { Component, OnInit, TemplateRef } from '@angular/core';

@Component({
    selector: 'app-add-user-comp',
    templateUrl: './add-user.component.html',
    styleUrls: ['./add-user.component.css']
})

export class AddUserComponent implements OnInit {
    constructor() { }

    ngOnInit(): void {
    }

    test: any;
}
