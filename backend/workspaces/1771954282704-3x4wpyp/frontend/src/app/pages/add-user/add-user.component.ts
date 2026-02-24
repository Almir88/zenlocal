import { Component } from '@angular/core';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ToastrService } from 'ngx-toastr';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-add-user',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './add-user.component.html',
  styleUrl: './add-user.component.scss',
})
export class AddUserComponent {
  form: FormGroup;
  loading = false;
  success = '';
  error = '';

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    public auth: AuthService,
    private toastr: ToastrService,
  ) {
    this.form = this.fb.nonNullable.group({
      name: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
    });
  }

  onSubmit() {
    this.error = '';
    this.success = '';
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { name, email, password } = this.form.getRawValue();
    this.loading = true;
    this.http
      .post<{
        id: string;
        email: string;
        name: string;
        role: string;
      }>(`${environment.apiUrl}/auth/users`, {
        name: name.trim(),
        email: email.trim(),
        password,
      })
      .subscribe({
        next: () => {
          this.loading = false;
          this.form.enable();
          this.success = `User ${email} created. They can log in with this email and password.`;
          this.form.reset();
          this.toastr.success(
            `User ${email} can log in with this email and password.`,
            'User added successfully',
          );
        },
        error: (err) => {
          this.loading = false;
          this.form.enable();
          const errMsg =
            err.error?.message ?? err.error?.detail ?? 'Failed to add user';
          this.error = errMsg;
          this.toastr.error(errMsg, 'Error adding user');
        },
      });
    this.form.disable();
  }
}
