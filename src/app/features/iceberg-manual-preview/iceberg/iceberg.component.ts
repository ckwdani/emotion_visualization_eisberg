import {AfterViewInit, Component, ElementRef, Input, OnChanges, OnInit, SimpleChanges, ViewChild} from '@angular/core';
import {EisbergService} from "../../../services/vis-services/eisberg.service";
import Two from "two.js";
import {Color} from "../../../entity/Color";
import {Polygon} from "two.js/src/shapes/polygon";
import {IcebergParams} from "../../../entity/Icebergparams";
import {IceBergConfig} from "../../../entity/IceBergConfig";
import {Vector} from "two.js/src/vector";
import {Tween} from "@tweenjs/tween.js";
import {HttpClient} from "@angular/common/http";
import {ModelOutput} from "../../../entity/ModelOutput";
import {Curve} from "two.js/src/utils/curves";
import {delay} from "rxjs";
import {Group} from "two.js/src/group";

const TWEEN = require('@tweenjs/tween.js')

@Component({
  selector: 'app-iceberg',
  templateUrl: './iceberg.component.html',
  styleUrls: ['./iceberg.component.scss']
})
export class IcebergComponent implements OnInit, AfterViewInit, OnChanges {

  @ViewChild('test') myDiv?: ElementRef;

  @Input() iceConfig: IceBergConfig = {
    color1: new Color('blue'),
    color2: new Color('green'),
    params: {
      skew: 0,
      frequency: 0,
      colorParam: 0,
      borderParam: 0,
      height: 0,
    }
  };

  twoCanvas = new Two();
  eisberg = new Group();

  params: IcebergParams = {skew: 0}


  constructor(private es: EisbergService, private httpClient: HttpClient) {
  }

  ngOnChanges(changes: SimpleChanges): void{
    if (changes['iceConfig'] !== undefined) {
      this.updateIceberg(changes['iceConfig'].currentValue.params)
    }
  }

  ngAfterViewInit(): void{
    var params = {
      fitted: true
    };
    //var elem = document.body;
    var elem = this.myDiv?.nativeElement;
    this.twoCanvas = new Two(params).appendTo(elem);

    this.drawIceberg();
  }

  updateSkew(event: any): void{
    this.updateIceberg({skew: event.target.value as number});
  }

  drawIceberg(): void{
    var radius = 200;
    var x = 300;
    var y = 240;

    let color1 = new Color("#00FFBB")
    let color2 = new Color("#AA00FF")
    this.eisberg = this.es.generateEisberg(radius, x, y, this.iceConfig);
    this.twoCanvas.add(this.eisberg);

// Don’t forget to tell two to draw everything to the screen
    this.twoCanvas.update();
  }

  updateIceberg(params: IcebergParams): void{
    this.es.updateIceberg(this.eisberg.children[0], params)
    this.twoCanvas.update();
  }

  ngOnInit(): void {
  }

}
