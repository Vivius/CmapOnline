import Vue from 'vue';
import VueResource from 'vue-resource';

Vue.use(VueResource);

var sign = new Vue({
    el: '#login',
    data: {
        show: true,
        mail: null,
        password: null,
        firstname: null,
        lastname: null,
        confirmPassword: null,
        wrongLogin: false,
        wrongConfirm: false,
        empty: false,
        existMail: false,
        passwordLength: false,
        mailFormat: false
    },
    methods: {
        changes: function () {
            this.show = !this.show;
            this.mail = null;
            this.password = null;
            this.firstname = null;
            this.lastname = null;
            this.confirmPassword = null;
        },
        postConnection: function () {
            this.$http.post('/login', { mail: this.mail, password: this.password}).then(response => {
                if(response.body)
                    window.location.href = '/home/';
                else
                    this.wrongLogin = true;
            }, response => {
                console.log('erreur', response.body);
            });
        },
        createAccount: function () {
            this.empty = false;
            this.existMail = false;
            this.passwordLength = false;
            this.mailFormat = false;
            var empty = (this.mail == null) || (this.password == null) || (this.firstname == null) || (this.lastname == null);
            var error = empty || (this.password != this.confirmPassword) || (this.password.length < 6) || (!validateEmail(this.mail));
            if(!error) {
                this.$http.post('/signup', {
                    mail: this.mail,
                    firstname: this.firstname,
                    lastname: this.lastname,
                    password: this.password,
                    confirmPassword: this.password
                }).then(response => {
                    if(response.body)
                        window.location.href = '/home/';
                    else
                        this.existMail = true;
                }, response => {
                    console.log('erreur', response.body);
                });
            } else if(empty) {
                this.empty = true;
            } else if(this.password != this.confirmPassword) {
                this.wrongConfirm = true;
            } else if(this.password.length < 6)
                this.passwordLength = true;
            else if(!validateEmail(this.mail))
                this.mailFormat = true;
        }
    }
});

function validateEmail(email) {
    var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(email);
}