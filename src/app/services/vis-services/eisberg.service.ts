import { Injectable } from '@angular/core';
import {Polygon} from "two.js/src/shapes/polygon";
import {LinearGradient} from "two.js/src/effects/linear-gradient";
import {Stop} from "two.js/src/effects/stop";
import Two from "two.js";
import {ColorService} from "./color.service";
import {Color} from "../../entity/Color";
import {IcebergParams} from "../../entity/Icebergparams";

@Injectable({
  providedIn: 'root'
})
export class EisbergService {

  color1 = new Color("#00FFBB")
  color2 = new Color("#AA00FF")

  constructor(private cs: ColorService) { }

  /** generate our whole iceberg with customizable paramters
   *
   * @param radius
   * @param x
   * @param y
   * @param skewPara
   * @param colorPara
   * @param patternPara
   */
  generateEisberg(radius: number, x: number, y: number,
                    skewPara = 0,
                    colorPara = 0,
                    patternPara = 0): Polygon{
    var poly = new Polygon(x, y ,radius, 3);


    // color1 = this.cs.getColorData(color1);
    // color2 = this.cs.getColorData(color2);
    // console.log(color1)
    var gradLinB =  this.generateGradient(patternPara ?? 0, this.cs.sampleColor(colorPara, this.color1, this.color2));

    //var gradLinB = color1.getHexString();
    // -0.7 to 0.7
    poly.skewX = this.generateSkewX(skewPara ?? 0, -1, 1)
    //circle.height = 300;
    poly.fill = gradLinB;
    poly.stroke = 'orangered';
    poly.linewidth = 5;
    return poly;

  }

  updateIceberg(iceberg: Polygon, newParams: IcebergParams): void{
    if(newParams.skew != undefined || newParams.skew != null){
      iceberg.skewX = this.generateSkewX(newParams.skew, -1, 1)
    }
    if(newParams.borderParam != undefined || newParams.borderParam != null){
      //border update
    }
    if(newParams.colorParam != undefined || newParams.colorParam != null){
      iceberg.fill = this.generateGradient(newParams.patternPara ?? 0, this.cs.sampleColor(newParams.colorParam, this.color1, this.color2));
    }
  }





  /**generate the tilt of the triangle
   *
   * @param value
   * @param min
   * @param max
   * @private
   */
  private generateSkewX(value: number, min: number, max: number): number{
    var minSkew = -0.7
    var maxSkew = 0.7
    //min -1 max 1
    return (value - min) / (max - min) * (maxSkew - minSkew) + minSkew;
  }

  /**generates the gradient and makes usage of generateStops
   *
   * @param value
   * @param color
   */
  private generateGradient(value: number, color: Color): LinearGradient{
    var tanhVal = Math.tanh(value);
    var stops = this.generateStops(tanhVal, color);
    return new LinearGradient(0, 0,
      0,
      1, stops)
  }

  /**
   * generates the stops according to the tan value
   *
   * @param value
   * @param color
   */
  private generateStops(value: number, color: Color): Array<Stop>{

    let color1 = this.cs.generateSecondColor(color);
    let color2 = color.getHexString();
    var stopsPredefined = [
      new Two.Stop(0.0, color2, 1),
      //new Two.Stop(0.2, "green", 1),
      new Two.Stop(0.0, color1.getHexString(), 1),
    ]
    var grads=20

    if(value>0){
      grads = Math.ceil((value+1)*grads)
    }
    if(value<0){
      grads = Math.ceil((value+1)*grads)
    }

    var gradsDist =  1/grads

    var stops = [new Two.Stop(0.0, color2, 1)];

    var distInLoop = 0

    for(let i = 0; i < grads; i++){
      if(i%2==1){
        stops.push(
          new Two.Stop(distInLoop, color2, 1)
        )
        distInLoop = distInLoop+gradsDist
        //stops.push(new Two.Stop( distInLoop, color2, 1))
      }else{
        stops.push(
          new Two.Stop(distInLoop, color1.getHexString(),1)
        )
        distInLoop = distInLoop+gradsDist
        //stops.push(new Two.Stop( distInLoop, color1, 1))
      }
      stops.push()
    }
    if(grads % 2 == 1){
      stops.push(new Two.Stop( 1, color2, 1))
    }
    else {
      stops.push(new Two.Stop( 1, color1.getHexString(), 1))

    }
    return stops
  }
}
