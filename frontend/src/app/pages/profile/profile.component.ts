import { Component } from '@angular/core';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../core/auth.service';
import type { User } from '../../core/interfaces/auth.interface';
import { environment } from '../../../environments/environment';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss',
})
export class ProfileComponent {
  profileForm: FormGroup;
  passwordForm: FormGroup;
  profileSaving = false;
  passwordSaving = false;

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    public auth: AuthService,
    private toastr: ToastrService,
  ) {
    const u = this.auth.currentUser();
    this.profileForm = this.fb.group({
      name: [u?.name ?? '', [Validators.required, Validators.minLength(1)]],
      email: [u?.email ?? '', [Validators.required, Validators.email]],
    });
    this.passwordForm = this.fb.group({
      currentPassword: ['', Validators.required],
      newPassword: ['', [Validators.required, Validators.minLength(8)]],
    });
  }

  saveProfile(): void {
    if (this.profileForm.invalid) return;
    this.profileSaving = true;
    this.http
      .patch<User>(`${environment.apiUrl}/auth/me`, this.profileForm.value)
      .subscribe({
        next: (user) => {
          this.auth.setUser(user);
          this.profileSaving = false;
          this.toastr.success('Profile updated');
        },
        error: (err) => {
          this.profileSaving = false;
          this.toastr.error(
            err.error?.message ??
              err.error?.detail ??
              'Failed to update profile',
          );
        },
      });
  }

  changePassword(): void {
    if (this.passwordForm.invalid) return;
    this.passwordSaving = true;
    this.http
      .post<{
        message: string;
      }>(`${environment.apiUrl}/auth/change-password`, this.passwordForm.value)
      .subscribe({
        next: () => {
          this.passwordForm.reset();
          this.passwordSaving = false;
          this.toastr.success('Password updated');
        },
        error: (err) => {
          this.passwordSaving = false;
          this.toastr.error(
            err.error?.message ??
              err.error?.detail ??
              'Failed to change password',
          );
        },
      });
  }
}
