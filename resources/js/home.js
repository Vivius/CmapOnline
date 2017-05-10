/**
 * Created by Victor on 09/05/2017.
 */
import  Vue from 'vue/dist/vue';
import VueResource from 'vue-resource';
Vue.use(VueResource);


var app = new Vue({
    el: '#app',
    data: {
        name: '',
        seen: false,
        confirm: -1,
        styleObject: {
            'visibility': 'visible',
        },
        items:[],
        confirm: -1
    },
    methods: {
        insertGraph: function (event) {
            this.seen = false;
            this.$http.post('/graph/create', {name: this.name }).then(response => {
            }, response => {
            });
            this.name = '';
            app.getAllGraphs();
        },
        getAllGraphs: function (event) {
            this.$http.get('/graph/getAll').then(response => {
                this.items = response.body;
            }, response => {
            });
        },
        deleteGraph: function (event) {
            this.$http.post('/graph/deleteOne',{_id: event}).then(response => {
            }, response => {
            });
            app.getAllGraphs();
        },
        redirectToGraph: function(event) {
            window.location.href = '/edit/'+event;
        }
    },
    filters: {
        convertDate: function (date) {
            if (!date) return ''
            var date = new Date(date);
            var monthNames = [
                "janvier", "février", "mars",
                "avril", "mai", "juin", "juillet",
                "août", "septembre", "octobre",
                "novembre", "décembre"
            ];

            var day = date.getDate();
            var monthIndex = date.getMonth();
            var year = date.getFullYear();

            return day + ' ' + monthNames[monthIndex] + ' ' + year;
        }
    }
})


app.getAllGraphs();